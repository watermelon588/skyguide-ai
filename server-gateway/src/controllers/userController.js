const User = require("../models/Users");

exports.updateLocation = async (req, res, next) => {
    try {
        const {
            latitude,
            longitude,
            elevation_m,
            timezone,
        } = req.body;

        const user = await User.findByIdAndUpdate(
            req.user._id,
            {
                location: {
                    type: "Point",
                    coordinates: [
                        longitude,
                        latitude,
                    ],
                    elevation_m,
                    timezone,
                },
            },
            {
                new: true,
                runValidators: true,
            }
        );

        res.status(200).json({
            success: true,
            message: "Location updated successfully.",
            user,
        });
    } catch (error) {
        next(error);
    }
};