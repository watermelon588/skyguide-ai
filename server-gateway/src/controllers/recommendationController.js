const Telescope = require("../models/Telescope");
const Observation = require("../models/Observation");
const {
    fetchRecommendations,
    fetchSkyQuality,
    fetchDarkSites,
    fetchWeather,
    AstroEngineClientError,
} = require("../services/astroEngineClient");
const { generateBrief, composeBriefFallback } = require("../services/groqService");
const { reverseGeocode } = require("../utils/geocode");
const computeCache = require("../services/computeCache");

/**
 * Cache windows. The sky moves, so "fresh" is short; but a slightly-old sky
 * beats a blank panel, so we serve stale well past fresh while refreshing behind
 * it (see services/computeCache). Beyond `staleMs` the data is wrong enough that
 * a caller waits for a real recompute.
 */
const RECS_FRESH_MS = 10 * 60 * 1000; // matches the client's 10-min poll
const RECS_STALE_MS = 30 * 60 * 1000;
const BRIEF_FRESH_MS = 3 * 60 * 60 * 1000;
const BRIEF_STALE_MS = 12 * 60 * 60 * 1000;

/** Rounded coordinate — recommendations don't change within ~1 km. */
const locSig = (o) => `${o.latitude.toFixed(2)},${o.longitude.toFixed(2)}`;

/** Telescope signature: the optics that change the ranking. */
const scopeSig = (t) =>
  t ? `a${t.aperture_mm ?? "_"}f${t.focal_length_mm ?? "_"}b${t.bortle_scale ?? "_"}` : "noscope";

/**
 * Recommendations gateway (Feature 8).
 *
 * The astro engine is stateless about users, so this controller's whole job
 * is assembly: observer coordinates + telescope + observation history come
 * out of Mongo here, get forwarded to the engine, and the engine's science
 * comes back untouched. No astronomy happens in this file.
 */

/** Observer payload from the signed-in user, or null when no location set. */
function observerFrom(user) {
    const coords = user?.location?.coordinates;
    if (
        !Array.isArray(coords) ||
        coords.length !== 2 ||
        (coords[0] === 0 && coords[1] === 0)
    ) {
        return null;
    }
    return {
        latitude: coords[1],
        longitude: coords[0],
        elevation: user.location.elevation_m ?? 0,
        timezone: user.location.timezone ?? null,
    };
}

/**
 * The user's telescope for the engine: the dedicated Telescope doc is the
 * source of truth for optics; bortle_scale only exists on the legacy embedded
 * profile, so the two merge here.
 */
async function telescopeFrom(user) {
    const scope = await Telescope.findOne({ userId: user._id }).lean();
    const legacy = user.telescopeProfile?.[0] ?? {};

    const aperture = scope?.aperture_mm ?? legacy.aperture_mm ?? null;
    const focal = scope?.focal_length_mm ?? legacy.focal_length_mm ?? null;
    const bortle = legacy.bortle_scale ?? null;

    if (aperture == null && focal == null && bortle == null) return null;
    return {
        aperture_mm: aperture,
        focal_length_mm: focal,
        bortle_scale: bortle,
    };
}

/** Resolved history (observed + skipped) in the engine's request shape. */
async function historyFrom(user) {
    const rows = await Observation.find({
        user: user._id,
        status: { $in: ["observed", "skipped"] },
    })
        .select("catalog_id status resolvedAt")
        .lean();

    if (rows.length === 0) return null;

    const observed = [];
    const skipped = [];
    for (const row of rows) {
        if (row.status === "observed") {
            observed.push({
                id: row.catalog_id,
                at: row.resolvedAt ? row.resolvedAt.toISOString() : null,
            });
        } else {
            skipped.push(row.catalog_id);
        }
    }
    return { observed, skipped };
}

/** Engine trouble is a 503 (try again), not a 500 (we broke). */
function relayEngineError(err, res, next) {
    if (err instanceof AstroEngineClientError) {
        return res.status(503).json({ success: false, message: err.message });
    }
    return next(err);
}

const NO_LOCATION_MSG =
    "Set your observing location first — recommendations are computed for your exact sky.";

// GET /api/v1/recommendations?limit=10
exports.getRecommendations = async (req, res, next) => {
    try {
        const observer = observerFrom(req.user);
        if (!observer) {
            return res
                .status(400)
                .json({ success: false, message: NO_LOCATION_MSG, gate: "no-location" });
        }

        const [telescope, history] = await Promise.all([
            telescopeFrom(req.user),
            historyFrom(req.user),
        ]);

        const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 20);

        // Cache the assembled response so the user never waits on the engine's
        // multi-second pipeline twice. History is part of the key (via its size)
        // so logging an observation recomputes; location and optics likewise.
        const historyN = (history?.observed?.length ?? 0) + (history?.skipped?.length ?? 0);
        const key = `recs:${req.user._id}:${locSig(observer)}:${scopeSig(telescope)}:h${historyN}:l${limit}`;

        const { value, cached, computedAt, stale } = await computeCache.remember(key, {
            freshMs: RECS_FRESH_MS,
            staleMs: RECS_STALE_MS,
            compute: () => fetchRecommendations({ ...observer, telescope, history, limit }),
        });

        res.status(200).json({
            success: true,
            data: value,
            meta: { cached, stale, computedAt },
        });
    } catch (err) {
        relayEngineError(err, res, next);
    }
};

// GET /api/v1/recommendations/sky-quality
exports.getSkyQuality = async (req, res, next) => {
    try {
        const observer = observerFrom(req.user);
        if (!observer) {
            return res
                .status(400)
                .json({ success: false, message: NO_LOCATION_MSG, gate: "no-location" });
        }
        const data = await fetchSkyQuality(observer);
        res.status(200).json({ success: true, data });
    } catch (err) {
        relayEngineError(err, res, next);
    }
};

/**
 * Best-effort place names for dark-site candidates. Nominatim allows ~1 req/s,
 * so lookups run sequentially and cache by rounded coordinate — the atlas grid
 * is static, so entries never need to expire.
 */
const placeNameCache = new Map();
const PLACE_CACHE_MAX = 500;

async function nameSites(sites) {
    const named = [];
    for (const site of sites) {
        const key = `${site.latitude.toFixed(2)},${site.longitude.toFixed(2)}`;
        let place = placeNameCache.get(key);
        if (place === undefined) {
            place = await reverseGeocode(site.latitude, site.longitude);
            if (placeNameCache.size >= PLACE_CACHE_MAX) {
                placeNameCache.delete(placeNameCache.keys().next().value);
            }
            placeNameCache.set(key, place);
        }
        const label = [place?.city, place?.state].filter(Boolean).join(", ");
        named.push({ ...site, place: label || null });
    }
    return named;
}

// GET /api/v1/recommendations/dark-sites?radius=150
exports.getDarkSites = async (req, res, next) => {
    try {
        const observer = observerFrom(req.user);
        if (!observer) {
            return res
                .status(400)
                .json({ success: false, message: NO_LOCATION_MSG, gate: "no-location" });
        }

        const maxKm = Math.min(Math.max(Number(req.query.radius) || 150, 10), 300);
        const data = await fetchDarkSites({ ...observer, maxKm });
        data.sites = await nameSites(data.sites ?? []);

        res.status(200).json({ success: true, data });
    } catch (err) {
        relayEngineError(err, res, next);
    }
};

/**
 * Assemble the grounded facts the brief is written from — ONLY computed values,
 * the entire universe the LLM (and the fallback) may draw from.
 */
async function buildBriefFacts(user, observer) {
    const [telescope, history, plannedCount] = await Promise.all([
        telescopeFrom(user),
        historyFrom(user),
        Observation.countDocuments({ user: user._id, status: "planned" }),
    ]);

    const recs = await fetchRecommendations({ ...observer, telescope, history, limit: 5 });

    // Weather is a nice-to-have — a dead weather engine must not kill the brief.
    let weather = null;
    try {
        const w = await fetchWeather(observer);
        weather = {
            condition: w?.weather?.condition ?? null,
            cloud_cover: w?.weather?.cloud_cover ?? null,
            observing_quality: w?.observing_conditions?.observing_quality ?? null,
        };
    } catch {
        /* brief proceeds without weather */
    }

    return {
        place: [user.location?.city, user.location?.country].filter(Boolean).join(", ") || null,
        darkness: recs.darkness,
        moon: recs.moon,
        sky_quality: recs.sky_quality,
        weather,
        planned_count: plannedCount,
        targets: (recs.objects ?? []).map((o) => ({
            id: o.catalog_id,
            name: o.name,
            type: o.object_type,
            score: o.recommendation_score,
            reasons: o.reasons,
            best_window: o.best_window,
        })),
    };
}

/**
 * Produce the brief text: the LLM when it answers promptly, the deterministic
 * composition when it doesn't. Either way the caller gets grounded prose, never
 * an error — the brief is a nicety, not a thing worth failing a page over.
 */
async function writeBrief(user, observer) {
    const facts = await buildBriefFacts(user, observer);
    try {
        const brief = await generateBrief(facts);
        if (brief) return { brief, source: "llm" };
    } catch (err) {
        console.error("Brief LLM failed; using deterministic fallback:", err.message);
    }
    return { brief: composeBriefFallback(facts), source: "fallback" };
}

// GET /api/v1/recommendations/brief
exports.getBrief = async (req, res, next) => {
    try {
        const observer = observerFrom(req.user);
        if (!observer) {
            return res
                .status(400)
                .json({ success: false, message: NO_LOCATION_MSG, gate: "no-location" });
        }

        const key = `brief:${req.user._id}:${locSig(observer)}`;
        const { value, cached, computedAt, stale } = await computeCache.remember(key, {
            freshMs: BRIEF_FRESH_MS,
            staleMs: BRIEF_STALE_MS,
            compute: () => writeBrief(req.user, observer),
        });

        res.status(200).json({
            success: true,
            data: {
                brief: value.brief,
                source: value.source,
                generatedAt: computedAt,
                cached,
                stale,
            },
        });
    } catch (err) {
        relayEngineError(err, res, next);
    }
};
