const express = require("express");
const { chat } = require("../controllers/chatcontroller");
const { optionalAuth } = require("../middleware/authMiddleware");
const { chatLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

// Astro talks to a metered third-party LLM (Groq), so every call spends real
// money. This was the only endpoint in the app with neither auth nor a limiter.
//
// `optionalAuth` rather than `protect` ON PURPOSE: the chat widget renders on
// the public landing page and /guide, so requiring a session would quietly
// delete a public feature. It attaches req.user when a session cookie is
// present, which lets chatLimiter give signed-in observers a real budget while
// holding anonymous callers to a tight per-IP cap.
router.post("/", optionalAuth, chatLimiter, chat);

module.exports = router;
