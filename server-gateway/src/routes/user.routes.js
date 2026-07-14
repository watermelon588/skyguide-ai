const express = require("express");

const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { updateLocation } = require("../controllers/userController");
const {
  getMyProfile,
  updateMyProfile,
  setAvatar,
  clearAvatar,
} = require("../controllers/profileController");

router.patch("/location", protect, updateLocation);

// --- Own profile (Feature 4) ---
router.get("/me/profile", protect, getMyProfile);
router.patch("/me/profile", protect, updateMyProfile);

// Avatars are inline data URLs (~150 KB) — larger than the global 100 KB JSON
// cap, so this one route gets its own parser.
router.post("/me/avatar", protect, express.json({ limit: "300kb" }), setAvatar);
router.delete("/me/avatar", protect, clearAvatar);

module.exports = router;