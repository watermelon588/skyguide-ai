/**
 * HTTP client for the FastAPI Astro Engine.
 *
 * The gateway never performs astronomy — it asks the engine. This client is
 * the only place the engine's URL and transport concerns (timeouts, error
 * normalization) live, so callers deal in plain objects and typed errors.
 *
 * Config: FASTAPI_URL env var (already in .env; defaults to the local dev
 * engine).
 */

const ASTRO_ENGINE_URL = (
    process.env.FASTAPI_URL || "http://localhost:8000"
).replace(/\/+$/, "");

const REQUEST_TIMEOUT_MS = 4000;

/** Error with a stable `code` the socket layer can map to client messages. */
class AstroEngineClientError extends Error {
    constructor(code, message) {
        super(message);
        this.name = "AstroEngineClientError";
        this.code = code; // "TARGET_NOT_FOUND" | "ENGINE_REJECTED" | "ENGINE_UNAVAILABLE"
    }
}

async function post(path, body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response;
    try {
        response = await fetch(`${ASTRO_ENGINE_URL}${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: controller.signal,
        });
    } catch (err) {
        throw new AstroEngineClientError(
            "ENGINE_UNAVAILABLE",
            `Astro Engine unreachable: ${err.message}`
        );
    } finally {
        clearTimeout(timer);
    }

    let payload = null;
    try {
        payload = await response.json();
    } catch {
        // Non-JSON body — fall through to the status handling below.
    }

    if (!response.ok || !payload?.success) {
        const message = payload?.message || `Astro Engine HTTP ${response.status}`;
        if (response.status === 404) {
            throw new AstroEngineClientError("TARGET_NOT_FOUND", message);
        }
        throw new AstroEngineClientError("ENGINE_REJECTED", message);
    }

    return payload.data;
}

/**
 * Fetch an alignment ephemeris segment for an observer + target.
 *
 * @param {{ latitude, longitude, elevation }} observer
 * @param {{ catalogId?: string, ra?: number, dec?: number, name?: string }} target
 * @returns {Promise<object>} data from POST /api/v1/alignment/ephemeris
 */
async function fetchEphemeris(observer, target) {
    return post("/api/v1/alignment/ephemeris", {
        latitude: observer.latitude,
        longitude: observer.longitude,
        elevation: observer.elevation ?? 0,
        catalog_id: target.catalogId ?? null,
        ra: target.ra ?? null,
        dec: target.dec ?? null,
        name: target.name ?? null,
    });
}

module.exports = {
    fetchEphemeris,
    AstroEngineClientError,
    ASTRO_ENGINE_URL,
};
