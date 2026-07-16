const express = require("express");

const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const {
    getRecommendations,
    getSkyQuality,
    getDarkSites,
    getBrief,
} = require("../controllers/recommendationController");

// Personalized ranking of tonight's sky (Feature 8, Phase A).
router.get("/", protect, getRecommendations);

// Light pollution at the observer's location + nearest darker sites.
router.get("/sky-quality", protect, getSkyQuality);
router.get("/dark-sites", protect, getDarkSites);

// The LLM nightly brief (Feature 8, Phase B). Cached per user (~4 h).
router.get("/brief", protect, getBrief);

module.exports = router;
