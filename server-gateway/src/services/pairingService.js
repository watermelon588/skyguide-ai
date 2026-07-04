const jwt = require("jsonwebtoken");

// Single source of truth for how long a telescope pairing session lives.
// Both the signed token's expiry and the API's expiresAt derive from this.
const PAIRING_TOKEN_TTL_SECONDS = 5 * 60;

exports.PAIRING_TOKEN_TTL_SECONDS = PAIRING_TOKEN_TTL_SECONDS;

exports.createPairingToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: PAIRING_TOKEN_TTL_SECONDS,
    });
};
