const jwt = require("jsonwebtoken");

exports.createPairingToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "5m" });
};
