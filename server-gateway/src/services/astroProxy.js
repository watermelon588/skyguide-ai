/**
 * Read-only reverse proxy to the FastAPI Astro Engine.
 *
 * The engine is a private service; this is the only path by which a browser
 * may reach it. Three rules keep that boundary honest:
 *
 *   1. ALLOWLIST, not passthrough. Only the science endpoints the web app
 *      actually calls are forwarded. A generic proxy would re-expose every
 *      engine route the moment one is added.
 *   2. SAFE METHODS ONLY. The engine's read endpoints use POST for large
 *      payloads (observer coordinates), so POST must be allowed — but nothing
 *      that could mutate state is reachable, and the allowlist is what makes
 *      that true rather than a promise.
 *   3. The internal key is attached HERE. It never leaves the server, which is
 *      the whole reason the browser can no longer talk to the engine directly.
 */

const ASTRO_ENGINE_URL = (
    process.env.FASTAPI_URL || "http://localhost:8000"
).replace(/\/+$/, "");

const INTERNAL_KEY = process.env.INTERNAL_API_KEY || "";

/**
 * Engine paths the browser may reach, as prefixes under /api/v1.
 * Derived from the frontend services that call the engine:
 *   catalog.service  -> /catalog, /catalog/stats, /catalog/:id
 *   tonight.service  -> /visibility/observable, /moon/current, /catalog
 *   weather.service  -> /weather/current
 * `recommendations`, `alignment` and `satellites` are deliberately absent:
 * those are server-to-server only and go through astroEngineClient.
 */
const ALLOWED_PREFIXES = [
    "/api/v1/catalog",
    "/api/v1/visibility",
    "/api/v1/moon",
    "/api/v1/weather",
    "/api/v1/health",
];

const ALLOWED_METHODS = new Set(["GET", "POST"]);

// Visibility over ~13k objects is the slow one; matches astroEngineClient's
// heavy budget rather than its 4s default, which would time out mid-page.
const PROXY_TIMEOUT_MS = 30000;

function isAllowed(path) {
    return ALLOWED_PREFIXES.some(
        (prefix) => path === prefix || path.startsWith(`${prefix}/`)
    );
}

/**
 * Express handler: forward the request to the engine and relay its response.
 *
 * Mounted with `router.use(...)`, so `req.url` is already relative to the mount
 * point — i.e. "/api/v1/catalog?page=2" for a request to
 * "/api/v1/astro/api/v1/catalog?page=2".
 */
async function proxyToAstroEngine(req, res) {
    if (!ALLOWED_METHODS.has(req.method)) {
        return res.status(405).json({
            success: false,
            message: `${req.method} is not supported by this endpoint.`,
        });
    }

    // Split the query string off before matching, so "?q=..." can't be used to
    // dress up a disallowed path as an allowed one.
    const [pathname, queryString] = req.url.split("?");

    if (!isAllowed(pathname)) {
        return res.status(404).json({
            success: false,
            message: "Not found.",
        });
    }

    const target = `${ASTRO_ENGINE_URL}${pathname}${
        queryString ? `?${queryString}` : ""
    }`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

    try {
        const headers = { Accept: "application/json" };
        if (INTERNAL_KEY) headers["X-Internal-Key"] = INTERNAL_KEY;

        let body;
        if (req.method === "POST") {
            headers["Content-Type"] = "application/json";
            // express.json() already parsed it; re-serialize rather than piping
            // the consumed stream.
            body = JSON.stringify(req.body ?? {});
        }

        const response = await fetch(target, {
            method: req.method,
            headers,
            body,
            signal: controller.signal,
        });

        const text = await response.text();

        // Relay the engine's status and JSON verbatim: the frontend's existing
        // response handling (response.data.data, error messages) must keep
        // working unchanged.
        res.status(response.status);
        res.set("Content-Type", response.headers.get("content-type") || "application/json");
        return res.send(text);
    } catch (err) {
        const timedOut = err.name === "AbortError";
        console.error(
            `Astro proxy ${req.method} ${pathname} failed:`,
            timedOut ? `timeout after ${PROXY_TIMEOUT_MS}ms` : err.message
        );
        return res.status(timedOut ? 504 : 502).json({
            success: false,
            message: timedOut
                ? "The astronomy engine took too long to respond."
                : "The astronomy engine is unavailable.",
        });
    } finally {
        clearTimeout(timer);
    }
}

module.exports = { proxyToAstroEngine, ALLOWED_PREFIXES };
