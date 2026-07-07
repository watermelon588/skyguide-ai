const User = require("../models/Users");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/email");
const crypto = require("crypto");

// Helper function to bundle JWT token creation and browser cookie options configuration
const sendTokenCookie = (user, statusCode, res) => {
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
        data: { user },
    });
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

        const verificationToken =
            user.createVerificationToken();

        await user.save({
            validateBeforeSave: false,
        });

        const verificationURL =
            `${req.protocol}://${req.get(
                "host"
            )}/api/v1/auth/verify-email/${verificationToken}`;

        await sendEmail({
            email: user.email,
            subject: "Verify Your Email",
            message: `Welcome to SkyGuide AI!

                        Please verify your email by clicking:

                        ${verificationURL}

                        This link expires in 10 minutes.
                        `,
        });

        res.status(201).json({
            success: true,
            message:
                "Registration successful. Please verify your email.",
        });
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

        if (!user) {
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

        if (!user.isVerified) {
            return res.status(403).json({
                success: false,
                message: "Please verify your email first.",
            });
        }

        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
        }

        // Update login timestamp tracking
        user.lastLogin = new Date();
        await user.save({ validateBeforeSave: false });

        sendTokenCookie(user, 200, res);
    } catch (error) {
        next(error);
    }
};

exports.verifyEmail =
    async (req, res, next) => {
        try {
            const hashedToken =
                crypto
                    .createHash("sha256")
                    .update(req.params.token)
                    .digest("hex");

            const user =
                await User.findOne({
                    verificationToken:
                        hashedToken,
                    verificationTokenExpires: {
                        $gt: Date.now(),
                    },
                });

            if (!user) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid or expired verification token.",
                });
            }

            user.isVerified = true;
            user.verificationToken =
                undefined;
            user.verificationTokenExpires =
                undefined;

            await user.save({
                validateBeforeSave: false,
            });

            res.status(200).json({
                success: true,
                message:
                    "Email verified successfully.",
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

exports.resendVerification =
    async (req, res, next) => {
        try {
            const { email } = req.body;

            const user = await User.findOne({
                email,
            });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User not found.",
                });
            }

            if (user.isVerified) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Email is already verified.",
                });
            }

            const verificationToken =
                user.createVerificationToken();

            await user.save({
                validateBeforeSave: false,
            });

            const verificationURL =
                `${req.protocol}://${req.get(
                    "host"
                )}/api/v1/auth/verify-email/${verificationToken}`;

            await sendEmail({
                email: user.email,
                subject:
                    "Verify your SkyGuide AI account",
                message:
                    `Please verify your email by clicking:

${verificationURL}

This link expires in 10 minutes.`,
            });

            res.status(200).json({
                success: true,
                message:
                    "Verification email sent successfully.",
            });
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