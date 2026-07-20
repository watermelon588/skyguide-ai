const express = require("express");

const router = express.Router();

const { optionalAuth } = require("../middleware/authMiddleware");
const { authLimiter } = require("../middleware/rateLimiter");
const { submitFeedback } = require("../controllers/feedbackController");

// Public — the footer form is on the landing page, so signed-out visitors can
// send feedback too. optionalAuth attaches req.user when a session cookie is
// present (so signed-in feedback is attributed), but never requires it. Rate
// limited to blunt spam.
router.post("/", authLimiter, optionalAuth, submitFeedback);

module.exports = router;
