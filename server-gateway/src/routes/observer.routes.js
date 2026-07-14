const express = require("express");

const router = express.Router();

const { optionalAuth } = require("../middleware/authMiddleware");
const { getPublicProfile } = require("../controllers/profileController");

// Public observer profile — reachable anonymously, but visibility-gated:
// optionalAuth lets "observers-only" profiles reveal to signed-in viewers
// while staying hidden (404/403) otherwise.
router.get("/:username", optionalAuth, getPublicProfile);

module.exports = router;
