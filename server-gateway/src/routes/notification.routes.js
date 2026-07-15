const express = require("express");

const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const {
  list,
  markRead,
  markAllRead,
  getPreferences,
  updatePreferences,
} = require("../controllers/notificationController");

// Notifications are personal — every route is members-only.
router.use(protect);

// Preferences first: "/preferences" must not be swallowed by "/:id/read".
router.get("/preferences", getPreferences);
router.patch("/preferences", updatePreferences);

router.get("/", list);
router.patch("/read-all", markAllRead);
router.patch("/:id/read", markRead);

module.exports = router;
