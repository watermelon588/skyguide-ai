const User = require("../models/Users");
const { reverseGeocode, searchPlaces } = require("../utils/geocode");
const geohash = require("../utils/geohash");

/**
 * Place lookup for the observer-location picker.
 *
 * Thin by design: all the work is in utils/geocode. Auth-gated even though the
 * data is public, so the gateway isn't an open proxy onto Nominatim (whose
 * usage policy we'd be answering for).
 */
exports.searchLocations = async (req, res, next) => {
    try {
        const results = await searchPlaces(req.query.q);
        res.status(200).json({
            success: true,
            count: results.length,
            results,
        });
    } catch (error) {
        next(error);
    }
};

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
                // Regional chat-room cell (~39 km). Moving far enough moves the
                // observer to a new room on their next save.
                geohash4: geohash.encode(latitude, longitude),
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