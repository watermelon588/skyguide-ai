const User = require("../models/Users");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/email");
const { welcomeEmail } = require("../utils/emailTemplates");
const crypto = require("crypto");
const network = require("../config/network");

/**
 * Coerce a request field to a plain string for use in a database query.
 *
 * A JSON body can contain objects and arrays, and Mongo treats `{"$ne": null}`
 * or `{"$gt": ""}` in a query position as an OPERATOR — so an unguarded
 * `findOne({ email })` can be steered into matching an arbitrary account.
 * bcrypt still blocks a full bypass, but this closes the enumeration and
 * unexpected-match surface at the source.
 *
 * Non-strings become "" rather than "[object Object]" so they simply fail to
 * match instead of silently querying for a nonsense literal.
 */
const asString = (value) => (typeof value === "string" ? value : "");

/**
 * The session cookie's security attributes.
 *
 * Extracted into ONE function because set and clear must agree exactly: a
 * browser only replaces a cookie when secure/sameSite/path match what it
 * stored. Logout used to pass a bare `{ httpOnly }`, so over a tunnel or in
 * production — where the cookie is written with `secure` + `sameSite: "none"`
 * — the clearing cookie was rejected and the session quietly survived logout.
 *
 * Derived from the network layer rather than NODE_ENV alone: `sameSite:"none"`
 * REQUIRES `secure`, and secure cookies require HTTPS, which is precisely what
 * tunnel/production mode provides and what local/LAN mode does not.
 */
const sessionCookieOptions = () => {
    const isSecure = network.isHttps();

    return {
        httpOnly: true, // Prevents XSS scripts reading cookie token
        secure: isSecure,
        // "none" is only legal alongside secure; "lax" keeps plain-HTTP local
        // and LAN development working exactly as before.
        sameSite: isSecure ? "none" : "lax",
        path: "/",
    };
};

// Helper function to bundle JWT token creation and browser cookie options configuration
const sendTokenCookie = (user, statusCode, res, extra = {}) => {
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
    });

    const cookieOptions = {
        ...sessionCookieOptions(),
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expires in 7 days matching token
    };

    res.status(statusCode).cookie("jwt", token, cookieOptions).json({
        success: true,
        data: { user, ...extra },
    });
};

/**
 * Email the observer their 6-digit verification code.
 *
 * BEST-EFFORT by design: never let a mail failure break the caller. Sign-up in
 * particular must not 500 after the account already exists — that used to
 * strand people with a real account they couldn't get into. The code is always
 * re-requestable from the app, so a dropped email is recoverable; a failed
 * sign-up is not.
 *
 * Returns true when the mail actually went out.
 */
const deliverVerificationCode = async (user, code) => {
    // Without SMTP configured there is no other way to finish verification
    // locally, so surface the code to the server console in development only.
    if (process.env.NODE_ENV !== "production") {
        console.log(`[dev] verification code for ${user.email}: ${code}`);
    }

    try {
        await sendEmail({
            email: user.email,
            subject: "Your SkyGuide AI verification code",
            message: `Welcome to SkyGuide AI!

Your verification code is:

    ${code}

Enter it in the app to verify your email. The code expires in 10 minutes.

If you didn't create this account, you can ignore this email.`,
        });
        return true;
    } catch (error) {
        console.error("Verification email failed to send:", error.message);
        return false;
    }
};

/**
 * Send the one-time welcome email. Best-effort and fire-and-forget: it must
 * never delay the sign-up response or fail it — a missed welcome is cosmetic,
 * unlike a missed verification code.
 */
const deliverWelcomeEmail = (user) => {
    const { subject, html, text } = welcomeEmail(user);
    sendEmail({ email: user.email, subject, message: text, html }).catch(
        (error) => console.error("Welcome email failed to send:", error.message),
    );
};

exports.register = async (req, res, next) => {
    try {
        const { password, location } = req.body;

        // Coerce the two credential lookups to strings BEFORE they reach the
        // query. JSON bodies can carry objects, so `{"email": {"$ne": null}}`
        // would otherwise arrive as a Mongo OPERATOR rather than a value and
        // match an arbitrary account. Casting collapses any such object to a
        // harmless string; see login() for the same guard.
        const username = asString(req.body.username);
        const email = asString(req.body.email);

        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "Username or email is already registered.",
            });
        }

        // Create the new user profile
        const user = await User.create({
            username,
            email,
            password,
            location,
        });

        const code = user.createVerificationCode();

        await user.save({
            validateBeforeSave: false,
        });

        const emailSent = await deliverVerificationCode(user, code);

        // Warm welcome, sent once. Fire-and-forget so it can't slow or break
        // sign-up (see deliverWelcomeEmail).
        deliverWelcomeEmail(user);

        // Sign the new observer IN immediately. Verification is deferred: an
        // account you can't use until you've read an email is a dead end, and
        // this endpoint previously returned no cookie at all — which is why the
        // very next /auth/me call answered "not authenticated".
        sendTokenCookie(user, 201, res, { emailSent });
    } catch (error) {
        next(error);
    }
};

exports.login = async (req, res, next) => {
    try {
        // Strings only — see asString(). `password` is coerced too: bcrypt
        // throws on a non-string candidate, which would surface as a 500 and
        // distinguish "malformed request" from "wrong password".
        const email = asString(req.body.email);
        const password = asString(req.body.password);

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide both an email and password.",
            });
        }

        // Explicitly select password field since it is omitted by default in the schema
        const user = await User.findOne({ email }).select("+password");

        // Verify the PASSWORD before revealing anything about the account.
        // These checks used to run in the opposite order, which let anyone probe
        // whether an address was registered (and whether it was verified) with
        // no valid credentials at all. One generic 401 covers both "no such
        // user" and "wrong password".
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: "Account has been disabled.",
            });
        }

        // NOTE: an unverified email deliberately does NOT block sign-in.
        // Verification is a deferred prompt inside the app, not a gate at the
        // door — locking someone out of the account they just created (and can
        // only unlock via an email that may never arrive) is a dead end.

        // Update login timestamp tracking
        user.lastLogin = new Date();
        await user.save({ validateBeforeSave: false });

        sendTokenCookie(user, 200, res);
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/v1/auth/verify-code  { code }   (authenticated)
 *
 * Redeem the 6-digit code. Scoped to the SIGNED-IN user rather than looking the
 * code up globally: a bare 6-digit lookup across all users would let an
 * attacker brute-force *somebody's* code (1M codes vs. every pending account),
 * whereas this only ever checks the code belonging to the caller.
 */
exports.verifyCode = async (req, res, next) => {
    try {
        const code = String(req.body.code ?? "").trim();

        if (!/^\d{6}$/.test(code)) {
            return res.status(400).json({
                success: false,
                message: "Enter the 6-digit code from your email.",
            });
        }

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        if (user.isVerified) {
            // Idempotent: verifying twice is a success, not an error.
            return res.status(200).json({
                success: true,
                message: "Email already verified.",
                data: { user },
            });
        }

        const hashedCode = crypto
            .createHash("sha256")
            .update(code)
            .digest("hex");

        const valid =
            user.verificationToken === hashedCode &&
            user.verificationTokenExpires &&
            user.verificationTokenExpires.getTime() > Date.now();

        if (!valid) {
            return res.status(400).json({
                success: false,
                message: "That code is invalid or has expired. Request a new one.",
            });
        }

        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpires = undefined;

        await user.save({ validateBeforeSave: false });

        res.status(200).json({
            success: true,
            message: "Email verified.",
            data: { user },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/v1/auth/send-verification-code   (authenticated)
 *
 * Issue a fresh code for the signed-in observer. Unlike sign-up, a mail failure
 * IS reported here — the user explicitly asked for a code, so silently
 * pretending it sent would leave them waiting on nothing.
 */
exports.sendVerificationCode = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        if (user.isVerified) {
            return res.status(400).json({
                success: false,
                message: "Your email is already verified.",
            });
        }

        const code = user.createVerificationCode();
        await user.save({ validateBeforeSave: false });

        const emailSent = await deliverVerificationCode(user, code);

        if (!emailSent) {
            return res.status(502).json({
                success: false,
                message:
                    "We couldn't send the email just now. Please try again in a moment.",
            });
        }

        res.status(200).json({
            success: true,
            message: `Verification code sent to ${user.email}.`,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/v1/auth/forgot-password  { email }
 *
 * Two things here are security-load-bearing, both easy to undo by accident:
 *
 * 1. The reset URL is built from the CONFIGURED client URL, never from the
 *    request. It previously used `req.get("host")`, which is attacker-supplied:
 *    a forged Host header made the gateway mail the real account holder a link
 *    pointing at the attacker's domain, handing over a valid reset token on
 *    click. Never build an emailed link from request headers.
 *
 * 2. The response is IDENTICAL whether or not the address is registered. The
 *    old 404 turned this endpoint into an account-existence oracle — which is
 *    exactly the leak that was already closed on /login.
 */
exports.forgotPassword =
    async (req, res, next) => {
        try {
            const email = asString(req.body.email).trim().toLowerCase();

            // Same answer in every branch below — see (2) above.
            const genericResponse = {
                success: true,
                message:
                    "If that email is registered, a password reset link is on its way.",
            };

            if (!email) {
                return res.status(200).json(genericResponse);
            }

            const user = await User.findOne({ email });

            if (!user) {
                return res.status(200).json(genericResponse);
            }

            const resetToken =
                user.createPasswordResetToken();

            await user.save({
                validateBeforeSave: false,
            });

            const resetURL = `${network
                .getClientUrl()
                .replace(/\/$/, "")}/reset-password/${resetToken}`;

            try {
                await sendEmail({
                    email: user.email,
                    subject:
                        "Password Reset Request",
                    message:
                        `Forgot your password?

Reset it here:

${resetURL}

This link expires in 10 minutes.`,
                });
            } catch (mailError) {
                // A mail failure must not become an existence oracle either:
                // log it, still answer generically.
                console.error(
                    "Password reset email failed to send:",
                    mailError.message
                );
            }

            res.status(200).json(genericResponse);
        } catch (error) {
            next(error);
        }
    };

exports.resetPassword =
    async (req, res, next) => {
        try {
            const hashedToken =
                crypto
                    .createHash("sha256")
                    .update(req.params.token)
                    .digest("hex");

            const user =
                await User.findOne({
                    passwordResetToken:
                        hashedToken,
                    passwordResetExpires: {
                        $gt: Date.now(),
                    },
                }).select("+password");

            if (!user) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid or expired reset token.",
                });
            }

            // asString so a non-string body can't reach the schema as a cast
            // error (a 500 where a 400 belongs). The schema's minlength still
            // rejects "" on save below.
            user.password = asString(req.body.password);

            user.passwordResetToken =
                undefined;

            user.passwordResetExpires =
                undefined;

            await user.save();

            sendTokenCookie(
                user,
                200,
                res
            );
        } catch (error) {
            next(error);
        }
    };

exports.logout = (req, res) => {
    // Overwrite the cookie token instantly with an expired setting.
    // The attributes MUST match the ones used to set it (see
    // sessionCookieOptions) or the browser keeps the original cookie and the
    // session outlives "log out".
    res.cookie("jwt", "loggedout", {
        ...sessionCookieOptions(),
        expires: new Date(Date.now() + 1000),
    });
    res.status(200).json({ success: true, message: "Logged out successfully." });
};