const rateLimit =
    require("express-rate-limit");

exports.authLimiter =
    rateLimit({
        windowMs:
            15 * 60 * 1000,
        max: 100,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            success: false,
            message:
                "Too many requests. Please try again later.",
        },
    });