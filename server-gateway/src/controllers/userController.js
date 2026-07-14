const User = require("../models/Users");
const { reverseGeocode } = require("../utils/geocode");

exports.updateLocation = async (req, res, next) => {
    try {
        const {
            latitude,
            longitude,
            elevation_m,
            timezone,
        } = req.body;

        // Best-effort coarse place labels (city/state/country) for the
        // observer's public profile. Never blocks the save — resolves to
        // nulls on any failure.
        const place = await reverseGeocode(latitude, longitude);

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
                    city: place.city,
                    state: place.state,
                    country: place.country,
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