const User = require("../models/Users");
const jwt = require("jsonwebtoken");

// Helper function to bundle JWT token creation and browser cookie options configuration
const sendTokenCookie = (user, statusCode, res) => {
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
    });

    const cookieOptions = {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expires in 7 days matching token
        httpOnly: true, // Prevents XSS scripts reading cookie token
        secure: process.env.NODE_ENV === "production", // Only transmits cookie over HTTPS in production
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // Protects against CSRF leaks
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

        sendTokenCookie(user, 201, res);
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

exports.logout = (req, res) => {
    // Overwrite the cookie token instantly with an expired setting
    res.cookie("jwt", "loggedout", {
        expires: new Date(Date.now() + 1000),
        httpOnly: true,
    });
    res.status(200).json({ success: true, message: "Logged out successfully." });
};