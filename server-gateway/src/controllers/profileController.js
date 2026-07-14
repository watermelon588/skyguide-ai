const profileService = require("../services/profileService");

/**
 * Profile controller (thin). Derives the user from the authenticated request
 * (never the body), delegates to profileService, shapes the response.
 */

// GET /api/v1/users/me/profile
exports.getMyProfile = async (req, res, next) => {
  try {
    const profile = await profileService.getMyProfile(req.user._id);
    res.status(200).json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/users/me/profile
exports.updateMyProfile = async (req, res, next) => {
  try {
    const profile = await profileService.updateMyProfile(req.user._id, req.body);
    res.status(200).json({
      success: true,
      message: "Profile updated.",
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/users/me/avatar  { avatar: <data-url> }
exports.setAvatar = async (req, res, next) => {
  try {
    const profile = await profileService.setAvatar(req.user._id, req.body.avatar);
    res.status(200).json({
      success: true,
      message: "Avatar updated.",
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/users/me/avatar
exports.clearAvatar = async (req, res, next) => {
  try {
    const profile = await profileService.clearAvatar(req.user._id);
    res.status(200).json({
      success: true,
      message: "Avatar removed.",
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/observers/:username  (public, visibility-gated)
exports.getPublicProfile = async (req, res, next) => {
  try {
    const profile = await profileService.getPublicProfile(
      req.params.username,
      req.user?._id ?? null,
    );
    res.status(200).json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
};
