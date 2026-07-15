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

async function get(path) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response;
    try {
        response = await fetch(`${ASTRO_ENGINE_URL}${path}`, {
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
        throw new AstroEngineClientError(
            "ENGINE_REJECTED",
            payload?.message || `Astro Engine HTTP ${response.status}`
        );
    }

    return payload.data;
}

/** The engine validates `limit <= 100` and 400s above it — don't raise this. */
const CATALOG_PAGE_LIMIT = 100;

/**
 * The whole static celestial catalog (names, descriptions, physical data),
 * following pagination.
 *
 * The visibility endpoint returns geometry with mostly-null `name` fields — the
 * catalog is where names actually live, which is why the frontend merges the
 * two by catalog_id. Server-side callers must do the same.
 *
 * @returns {Promise<object[]>} every catalog object
 */
async function fetchCatalog() {
    const first = await get(
        `/api/v1/catalog?page=1&limit=${CATALOG_PAGE_LIMIT}`
    );

    const objects = [...(first?.objects ?? [])];
    const totalPages = first?.pagination?.total_pages ?? 1;

    // 110 objects today = 2 pages. Bounded by the reported page count, so a
    // bad response can't spin this forever.
    for (let page = 2; page <= totalPages; page += 1) {
        const next = await get(
            `/api/v1/catalog?page=${page}&limit=${CATALOG_PAGE_LIMIT}`
        );
        objects.push(...(next?.objects ?? []));
    }

    return objects;
}

/**
 * Every object above the horizon for an observer, ranked by visibility score.
 * Same endpoint the frontend uses for /tonight — the digest is a composition of
 * existing science, not new science.
 *
 * @param {{ latitude, longitude, timezone }} observer
 * @returns {Promise<{observer, utc_time, count, objects: object[], moon?: object}>}
 */
async function fetchObservable(observer) {
    return post("/api/v1/visibility/observable", {
        latitude: observer.latitude,
        longitude: observer.longitude,
        timezone: observer.timezone,
    });
}

/**
 * Full lunar state for an observer (phase, illumination, rise/set, reserved
 * scoring fields).
 *
 * @param {{ latitude, longitude, timezone }} observer
 */
async function fetchMoon(observer) {
    return post("/api/v1/moon/current", {
        latitude: observer.latitude,
        longitude: observer.longitude,
        timezone: observer.timezone,
    });
}

module.exports = {
    fetchEphemeris,
    fetchObservable,
    fetchMoon,
    fetchCatalog,
    AstroEngineClientError,
    ASTRO_ENGINE_URL,
};
