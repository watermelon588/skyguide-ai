const telescopeService = require("../services/telescopeService");

/**
 * Telescope controller (thin).
 *
 * Derives userId from the authenticated request (never the body), delegates all
 * logic to telescopeService, and shapes the { success, message, data } response.
 * Validation-level (400) errors thrown by the service bubble to the global
 * handler via next().
 */

// GET /api/v1/telescope — the user's telescope, or data: null.
exports.getTelescope = async (req, res, next) => {
  try {
    const telescope = await telescopeService.getTelescope(req.user._id);

    res.status(200).json({
      success: true,
      message: telescope
        ? "Telescope retrieved successfully."
        : "No telescope configured.",
      data: telescope,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/telescope and PATCH /api/v1/telescope — create/replace (upsert).
exports.saveTelescope = async (req, res, next) => {
  try {
    const telescope = await telescopeService.saveTelescope(
      req.user._id,
      req.body
    );

    res.status(200).json({
      success: true,
      message: "Telescope saved successfully.",
      data: telescope,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/telescope — remove the user's telescope.
exports.deleteTelescope = async (req, res, next) => {
  try {
    const existed = await telescopeService.deleteTelescope(req.user._id);

    res.status(200).json({
      success: true,
      message: existed
        ? "Telescope removed successfully."
        : "No telescope to remove.",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
