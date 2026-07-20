const User = require("../models/Users");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/email");
const { welcomeEmail } = require("../utils/emailTemplates");
const crypto = require("crypto");

// Helper function to bundle JWT token creation and browser cookie options configuration
const sendTokenCookie = (user, statusCode, res, extra = {}) => {
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
    });

    const isSecure =
    process.env.NODE_ENV === "production" ||
    process.env.NETWORK_MODE === "tunnel";


    const cookieOptions = {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expires in 7 days matching token
        httpOnly: true, // Prevents XSS scripts reading cookie token
        secure: isSecure ,
        sameSite: isSecure ? "none" : "lax",
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
        const { username, email, password, location } = req.body;

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
        const { email, password } = req.body;

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

exports.forgotPassword =
    async (req, res, next) => {
        try {
            const user =
                await User.findOne({
                    email: req.body.email,
                });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message:
                        "No user found with that email.",
                });
            }

            const resetToken =
                user.createPasswordResetToken();

            await user.save({
                validateBeforeSave: false,
            });

            const resetURL =
                `${req.protocol}://${req.get(
                    "host"
                )}/api/v1/auth/reset-password/${resetToken}`;

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

            res.status(200).json({
                success: true,
                message:
                    "Password reset email sent.",
            });
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

            user.password =
                req.body.password;

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
    // Overwrite the cookie token instantly with an expired setting
    res.cookie("jwt", "loggedout", {
        expires: new Date(Date.now() + 1000),
        httpOnly: true,
    });
    res.status(200).json({ success: true, message: "Logged out successfully." });
};