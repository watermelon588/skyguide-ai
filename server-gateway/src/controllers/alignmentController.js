const jwt = require("jsonwebtoken");
const generateRoomId = require("../utils/generateRoomId");
const { createPairingToken } = require("../services/pairingService");

exports.createRoom =
    async (req, res, next) => {
        try {
            const roomId = generateRoomId();

            const token = createPairingToken({
                userId: req.user._id,
                roomId,
                type: "mount_pairing",
            });

            // Derive expiry from the signed token so the backend remains the
            // single source of truth for session lifetime.
            const { exp } = jwt.decode(token);
            const expiresAt = new Date(exp * 1000).toISOString();

            res.status(200).json({
                success: true,
                data: { roomId, token, expiresAt },
            });
        } catch (err) {
            next(err);
        }
    };
