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

/**
 * Recommendations run the whole visibility pipeline plus catalog + sky
 * sampling — measured ~6 s warm, more on a cold astropy cache. They get a
 * budget matched to the work; the 4 s default remains right for the
 * lightweight alignment/moon/weather calls.
 */
const HEAVY_TIMEOUT_MS = 30000;

/** Error with a stable `code` the socket layer can map to client messages. */
class AstroEngineClientError extends Error {
    constructor(code, message) {
        super(message);
        this.name = "AstroEngineClientError";
        this.code = code; // "TARGET_NOT_FOUND" | "ENGINE_REJECTED" | "ENGINE_UNAVAILABLE"
    }
}

async function post(path, body, { timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

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
 * `time` asks the engine what the sky looks like at some OTHER instant, which is
 * how the plan-urgency alert compares tonight against the same hour a fortnight
 * out. Omit it for "now".
 *
 * `maxMagnitude` / `limit` narrow the candidate pool and cap the result — the
 * catalog is ~13k objects, so an unbounded call is multi-megabyte and slow
 * enough to blow the default 4 s budget. Every caller here passes a magnitude
 * filter; the heavier timeout keeps a cold engine from 503-ing a background job.
 *
 * @param {{ latitude, longitude, timezone }} observer
 * @param {{ time?: string, maxMagnitude?: number, limit?: number }} [options]
 * @returns {Promise<{observer, utc_time, count, objects: object[], moon?: object}>}
 */
async function fetchObservable(observer, { time, maxMagnitude, limit } = {}) {
    return post(
        "/api/v1/visibility/observable",
        {
            latitude: observer.latitude,
            longitude: observer.longitude,
            timezone: observer.timezone,
            time: time ?? null,
            max_magnitude: maxMagnitude ?? null,
            limit: limit ?? null,
        },
        { timeoutMs: HEAVY_TIMEOUT_MS },
    );
}

/**
 * Upcoming passes of a station over the observer.
 *
 * Pass geometry is a Skyfield sweep over a TLE — heavier than an ephemeris
 * point, so it takes the heavy budget rather than the 4 s default.
 *
 * `visibleOnly` drops passes nobody could see (station in the Earth's shadow, or
 * the sky still bright). The engine defaults it OFF to preserve the raw
 * geometry; callers telling a human to go outside want it ON.
 *
 * @param {{ latitude, longitude, elevation?, timezone?, hours?, satellite?, visibleOnly? }} params
 * @returns {Promise<{satellite, window_hours, minimum_altitude_deg, visible_only, count, passes: object[]}>}
 */
async function fetchSatellitePasses({
    latitude,
    longitude,
    elevation = 0,
    timezone,
    hours = 24,
    satellite = "ISS",
    visibleOnly = false,
}) {
    return post(
        "/api/v1/satellites/passes",
        {
            latitude,
            longitude,
            elevation,
            timezone: timezone ?? null,
            hours,
            satellite,
            visible_only: visibleOnly,
        },
        { timeoutMs: HEAVY_TIMEOUT_MS },
    );
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

/**
 * Personalized recommendations (Feature 8, Phase A).
 *
 * The engine is stateless about users — the caller (recommendationController)
 * assembles observer + telescope + history and this just forwards.
 *
 * @param {object} payload  RecommendationRequest body (see engine schema)
 * @returns {Promise<object>} data from POST /api/v1/recommendations
 */
async function fetchRecommendations(payload) {
    return post("/api/v1/recommendations", payload, {
        timeoutMs: HEAVY_TIMEOUT_MS,
    });
}

/**
 * Light pollution at a coordinate (Lorenz atlas sample).
 * @returns {Promise<object>} data from POST /api/v1/sky-quality
 */
async function fetchSkyQuality({ latitude, longitude }) {
    // Warm this is instant; cold it fetches + decodes an atlas tile.
    return post(
        "/api/v1/sky-quality",
        { latitude, longitude },
        { timeoutMs: HEAVY_TIMEOUT_MS },
    );
}

/**
 * Nearest meaningfully darker observing sites.
 * @returns {Promise<object>} data from POST /api/v1/sky-quality/dark-sites
 */
async function fetchDarkSites({ latitude, longitude, maxKm, minImprovement }) {
    // A cold cache means fetching + decoding several atlas tiles.
    return post(
        "/api/v1/sky-quality/dark-sites",
        {
            latitude,
            longitude,
            max_km: maxKm ?? 150,
            min_improvement: minImprovement ?? 2,
        },
        { timeoutMs: HEAVY_TIMEOUT_MS },
    );
}

/**
 * Current weather + observing conditions for a coordinate.
 * @returns {Promise<object>} data from POST /api/v1/weather/current
 */
async function fetchWeather({ latitude, longitude }) {
    return post("/api/v1/weather/current", { latitude, longitude });
}

module.exports = {
    fetchEphemeris,
    fetchObservable,
    fetchMoon,
    fetchCatalog,
    fetchSatellitePasses,
    fetchRecommendations,
    fetchSkyQuality,
    fetchDarkSites,
    fetchWeather,
    AstroEngineClientError,
    ASTRO_ENGINE_URL,
};
