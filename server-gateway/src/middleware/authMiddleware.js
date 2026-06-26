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