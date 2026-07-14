const express = require("express");

const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { getNearby } = require("../controllers/communityController");

// Nearby observers — signed-in only (needs the viewer's own location to
// anchor the $geoNear, and discovery is a member feature).
router.get("/nearby", protect, getNearby);

module.exports = router;
