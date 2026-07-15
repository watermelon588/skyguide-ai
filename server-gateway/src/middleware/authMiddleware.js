const jwt = require("jsonwebtoken");
const User = require("../models/Users");

exports.protect = async (req, res, next) => {
    try {
        let token;

        // Extract authorization payload directly out of the incoming browser cookies state
        if (req.cookies && req.cookies.jwt) {
            token = req.cookies.jwt;
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "You are not authenticated. Access denied.",
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const currentUser = await User.findById(decoded.id);
        if (!currentUser || !currentUser.isActive) {
            return res.status(401).json({
                success: false,
                message: "The session owner account is no longer active.",
            });
        }

        req.user = currentUser;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Session expired or cookie token structure corrupted.",
        });
    }
};

/**
 * Populate req.user when a valid session cookie is present, but never reject.
 * For endpoints whose response DEPENDS on who's asking yet are also reachable
 * anonymously — e.g. a public profile that stays hidden for "observers-only"
 * visibility unless a signed-in observer is viewing.
 */
exports.optionalAuth = async (req, _res, next) => {
    try {
        const token = req.cookies?.jwt;
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const currentUser = await User.findById(decoded.id);
            if (currentUser && currentUser.isActive) {
                req.user = currentUser;
            }
        }
    } catch {
        // A bad/expired cookie just means "anonymous" here, not an error.
    }
    next();
};