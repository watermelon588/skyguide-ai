const express = require("express");
const { optionalAuth } = require("../middleware/authMiddleware");
const { astroProxyLimiter } = require("../middleware/rateLimiter");
const { proxyToAstroEngine } = require("../services/astroProxy");

const router = express.Router();

/**
 * Public read-only proxy to the FastAPI Astro Engine.
 *
 * WHY THIS EXISTS: the browser used to call the engine directly, which meant
 * the engine had to be internet-reachable with no authentication — anyone could
 * drive its heavy astropy pipelines for free, and CORS was no defence because
 * curl ignores it. Routing the same calls through the gateway makes the engine
 * a private service: it can bind to localhost (or require the internal key),
 * and every public request now passes one door we control and can rate-limit.
 *
 * `optionalAuth`, NOT `protect` — /tonight, /tonight/:id and /explore are public
 * routes. Requiring a session here would break browsing for signed-out visitors.
 * Auth is used only to give signed-in observers a roomier limiter bucket.
 *
 * Paths map 1:1 onto the engine, so the frontend keeps its existing URLs:
 *   GET /api/v1/astro/api/v1/catalog  ->  GET <engine>/api/v1/catalog
 */
router.use(optionalAuth, astroProxyLimiter, proxyToAstroEngine);

module.exports = router;
