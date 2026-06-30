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

            res.status(200).json({
                success: true,
                data: { roomId, token },
            });
        } catch (err) {
            next(err);
        }
    };