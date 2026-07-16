const notificationService = require("../services/notificationService");
const User = require("../models/Users");

/**
 * Notification controller (thin). The user always comes from the authenticated
 * request, never the body, so one observer can never read or clear another's.
 */

// GET /api/v1/notifications?before=<ISO>&limit=20
exports.list = async (req, res, next) => {
  try {
    const result = await notificationService.list(req.user._id, {
      before: req.query.before,
      limit: req.query.limit,
    });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/notifications/:id/read
exports.markRead = async (req, res, next) => {
  try {
    const notification = await notificationService.markRead(
      req.user._id,
      req.params.id,
    );
    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/notifications/read-all
exports.markAllRead = async (req, res, next) => {
  try {
    const result = await notificationService.markAllRead(req.user._id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const BOOLEANS = [
  "digest",
  "greatNight",
  "issAlerts",
  "planUrgency",
  "moonEvents",
  "email",
];

// PATCH /api/v1/notifications/preferences
exports.updatePreferences = async (req, res, next) => {
  try {
    const update = {};

    for (const key of BOOLEANS) {
      if (req.body[key] !== undefined) {
        update[`notificationPrefs.${key}`] = Boolean(req.body[key]);
      }
    }

    if (req.body.digestHourLocal !== undefined) {
      const hour = Number(req.body.digestHourLocal);
      if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
        return res.status(400).json({
          success: false,
          message: "digestHourLocal must be an integer from 0 to 23.",
        });
      }
      update["notificationPrefs.digestHourLocal"] = hour;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({
        success: false,
        message: `Nothing to update. Editable: ${[...BOOLEANS, "digestHourLocal"].join(", ")}.`,
      });
    }

    const user = await User.findByIdAndUpdate(req.user._id, update, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: "Notification preferences updated.",
      data: { notificationPrefs: user.notificationPrefs },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/notifications/preferences
exports.getPreferences = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: { notificationPrefs: req.user.notificationPrefs },
    });
  } catch (error) {
    next(error);
  }
};
