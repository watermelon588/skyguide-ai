const communityService = require("../services/communityService");

/**
 * Community controller (thin). Derives the viewer from the authenticated
 * request (never the body), delegates to communityService, shapes the HTTP
 * response. A `gate` in the payload is a normal 200 — it's a UX state
 * ("you're private" / "set your location"), not a failure.
 */

// GET /api/v1/community/nearby?radius=50
exports.getNearby = async (req, res, next) => {
  try {
    const result = await communityService.findNearby(req.user, req.query.radius);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
