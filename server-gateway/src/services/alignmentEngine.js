/**
 * Alignment engine — the realtime core of Session 14.
 *
 * Continuously answers: "how far is the telescope from the target?"
 *
 * Division of labour:
 *   Astro Engine (FastAPI)  → RA/DEC → Alt/Az + drift rates (all astronomy)
 *   this engine (gateway)   → per-room session state, linear extrapolation
 *                             of the ephemeris, spherical error geometry,
 *                             lock state machine, confidence scoring
 *
 * Sessions are purely in-memory (no persistence, per spec) and keyed by the
 * pairing room. Each incoming orientation packet costs microseconds: one
 * extrapolation + one great-circle separation — no allocation-heavy work,
 * no awaits on the hot path. Ephemeris refreshes happen in the background
 * (single-flight per session) while the old segment keeps extrapolating.
 *
 * The engine is transport-agnostic: the socket layer feeds packets in and
 * decides what to emit. Nothing here touches Socket.IO.
 */

const User = require("../models/Users");
const { getTelescope } = require("./telescopeService");
const { fetchEphemeris } = require("./astroEngineClient");
const {
    pointingError,
    extrapolateEphemeris,
} = require("../utils/alignmentMath");

// --- State machine thresholds (angular separation, degrees) ---------------
// locked ≤ 1° ≈ a low-power eyepiece's field of view — the target is in view.
const LOCK_DEG = 1.0;
const NEARLY_DEG = 3.0;
const CLOSE_DEG = 10.0;
// Hysteresis: lock engages only after the error stays inside LOCK_DEG for
// LOCK_HOLD_MS, and releases only beyond LOCK_DEG × UNLOCK_FACTOR — a hand
// tremor at the boundary must not strobe locked/unlocked.
const LOCK_HOLD_MS = 600;
const UNLOCK_FACTOR = 1.6;

// Ephemeris care: refresh when the segment outlives its validity; if the
// engine is unreachable, keep extrapolating (rates make this safe for
// minutes) but retry on a backoff and degrade confidence.
const REFRESH_RETRY_MS = 5000;
const EPHEMERIS_STALE_FACTOR = 5; // beyond validity × this → confidence hit

// No orientation packets for this long → the telescope direction is unknown.
// Phone keepalive is 500ms, mirroring useOrientationFeed's 2s + margin.
const STREAM_LOST_MS = 2500;

// Sparse logging: aggregate throughput/latency every N packets.
const LOG_EVERY_PACKETS = 1000;

const CONFIDENCE_BASE = { high: 95, medium: 75, low: 45, initializing: 20 };

const sessions = new Map(); // roomId → session

function getSession(roomId) {
    return sessions.get(roomId) || null;
}

/**
 * Create (or retarget) the alignment session for a pairing room.
 * Loads the observer + telescope once and fetches the first ephemeris.
 * Throws AstroEngineClientError or Error("NO_OBSERVER") for the socket
 * layer to translate.
 */
async function startSession({ roomId, userId, target }) {
    const user = await User.findById(userId).lean();
    const coords = user?.location?.coordinates;
    const hasObserver =
        Array.isArray(coords) && (coords[0] !== 0 || coords[1] !== 0);
    if (!hasObserver) {
        const err = new Error("Observer location is not set.");
        err.code = "NO_OBSERVER";
        throw err;
    }

    const observer = {
        latitude: coords[1], // GeoJSON stores [longitude, latitude]
        longitude: coords[0],
        elevation: user.location.elevation_m ?? 0,
    };

    // Telescope is context, not a prerequisite — alignment still works
    // without a saved profile (spec: "No Telescope" must not crash).
    const telescope = await getTelescope(userId).catch(() => null);

    const ephemeris = await fetchEphemeris(observer, target);

    const existing = sessions.get(roomId);
    const session = {
        roomId,
        userId: String(userId),
        observer,
        telescope: telescope
            ? { nickname: telescope.nickname, model: telescope.model }
            : null,
        target: ephemeris.target,
        ephemeris: stampEphemeris(ephemeris),
        refreshing: false,
        nextRefreshNotBefore: 0,
        state: "searching",
        lockCandidateSince: null,
        lastPacketAt: existing?.lastPacketAt ?? null,
        stats: { packets: 0, execNsTotal: 0n },
    };
    sessions.set(roomId, session);

    console.log(
        `[alignment] ${existing ? "target changed" : "started"} room=${roomId} ` +
            `target=${session.target.catalog_id || session.target.name} ` +
            `alt=${ephemeris.altitude_deg}° az=${ephemeris.azimuth_deg}°`
    );
    return session;
}

function clearSession(roomId) {
    if (sessions.delete(roomId)) {
        console.log(`[alignment] stopped room=${roomId}`);
    }
}

function stampEphemeris(data) {
    return { ...data, epochMs: Date.parse(`${data.utc_time}Z`) || Date.now() };
}

/** Background single-flight refresh; the hot path never awaits this. */
function maybeRefreshEphemeris(session, now) {
    const ageS = (now - session.ephemeris.epochMs) / 1000;
    if (ageS < session.ephemeris.valid_for_s) return;
    if (session.refreshing || now < session.nextRefreshNotBefore) return;

    session.refreshing = true;
    fetchEphemeris(session.observer, {
        catalogId: session.target.catalog_id,
        ra: session.target.ra_deg,
        dec: session.target.dec_deg,
        name: session.target.name,
    })
        .then((data) => {
            // The session may have been cleared/retargeted mid-flight.
            const current = sessions.get(session.roomId);
            if (current !== session) return;
            session.ephemeris = stampEphemeris(data);
        })
        .catch((err) => {
            session.nextRefreshNotBefore = Date.now() + REFRESH_RETRY_MS;
            console.warn(
                `[alignment] ephemeris refresh failed room=${session.roomId}: ${err.message}`
            );
        })
        .finally(() => {
            session.refreshing = false;
        });
}

function nextState(session, angularError, aboveHorizon, now) {
    if (!aboveHorizon) {
        session.lockCandidateSince = null;
        return "below_horizon";
    }
    if (session.state === "locked") {
        // Sticky until the error clearly leaves the lock zone.
        if (angularError <= LOCK_DEG * UNLOCK_FACTOR) return "locked";
    }
    if (angularError <= LOCK_DEG) {
        if (session.lockCandidateSince == null) session.lockCandidateSince = now;
        if (now - session.lockCandidateSince >= LOCK_HOLD_MS) return "locked";
        return "nearly_aligned"; // inside lock zone, hold time not met yet
    }
    session.lockCandidateSince = null;
    if (angularError <= NEARLY_DEG) return "nearly_aligned";
    if (angularError <= CLOSE_DEG) return "close";
    return "searching";
}

function scoreConfidence(model, ephemerisAgeS, validForS) {
    let score = CONFIDENCE_BASE[model.confidence] ?? 20;

    const cal = model.calibration || {};
    if (cal.source === "none" || cal.status === "unreferenced") {
        // No north reference → heading has an arbitrary zero; the azimuth
        // comparison is not meaningful, whatever the sensors' precision.
        score = Math.min(score, 30);
    } else if (cal.status === "degraded") {
        score -= 15;
    }

    if (ephemerisAgeS > validForS * EPHEMERIS_STALE_FACTOR) score -= 30;
    else if (ephemerisAgeS > validForS) score -= 10;

    return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Process one orientation packet for a room. Synchronous and cheap.
 *
 * @returns {{ result: object, transition: {from,to}|null } | null}
 *          null when there is no session/target or the packet is unusable.
 */
function ingest(roomId, packet, now = Date.now()) {
    const session = sessions.get(roomId);
    if (!session) return null;

    const heading = packet?.heading;
    const pitch = packet?.pitch;
    if (!Number.isFinite(heading) || !Number.isFinite(pitch)) return null;

    const started = process.hrtime.bigint();
    session.lastPacketAt = now;

    maybeRefreshEphemeris(session, now);

    const eph = session.ephemeris;
    const ageS = (now - eph.epochMs) / 1000;
    const { altitude, azimuth } = extrapolateEphemeris(eph, ageS);

    const errors = pointingError({
        heading,
        pitch,
        targetAz: azimuth,
        targetAlt: altitude,
    });

    const previous = session.state;
    const state = nextState(session, errors.angularError, altitude > 0, now);
    session.state = state;
    const transition = state !== previous ? { from: previous, to: state } : null;

    const confidence = scoreConfidence(packet, ageS, eph.valid_for_s);

    session.stats.packets += 1;
    session.stats.execNsTotal += process.hrtime.bigint() - started;
    if (session.stats.packets % LOG_EVERY_PACKETS === 0) {
        const avgUs = Number(
            session.stats.execNsTotal / BigInt(session.stats.packets) / 1000n
        );
        console.log(
            `[alignment] room=${roomId} packets=${session.stats.packets} ` +
                `avg_exec=${avgUs}µs err=${errors.angularError.toFixed(2)}° state=${state}`
        );
    }
    if (transition) {
        console.log(
            `[alignment] room=${roomId} ${previous} → ${state} ` +
                `(err=${errors.angularError.toFixed(2)}°)`
        );
    }

    return {
        transition,
        result: {
            v: 1,
            t: now,
            seq: packet.seq ?? null,
            target: {
                id: session.target.catalog_id,
                name: session.target.name,
            },
            target_altitude: round(altitude, 3),
            target_azimuth: round(azimuth, 3),
            above_horizon: altitude > 0,
            telescope: { heading: round(heading, 2), pitch: round(pitch, 2) },
            horizontal_error: round(errors.horizontalError, 2),
            vertical_error: round(errors.verticalError, 2),
            angular_error: round(errors.angularError, 2),
            state,
            aligned: state === "locked",
            confidence,
            ephemeris_age_s: round(ageS, 1),
        },
    };
}

/**
 * Mark sessions whose orientation stream went silent as "lost".
 * Called by the socket layer's sweeper; returns the transitions to emit.
 */
function sweepLostStreams(now = Date.now()) {
    const lost = [];
    for (const session of sessions.values()) {
        if (
            session.state !== "lost" &&
            session.lastPacketAt != null &&
            now - session.lastPacketAt > STREAM_LOST_MS
        ) {
            const from = session.state;
            session.state = "lost";
            session.lockCandidateSince = null;
            lost.push({ roomId: session.roomId, from });
            console.log(`[alignment] room=${session.roomId} ${from} → lost (stream silent)`);
        }
    }
    return lost;
}

function round(v, d) {
    const f = 10 ** d;
    return Math.round(v * f) / f;
}

module.exports = {
    startSession,
    clearSession,
    getSession,
    ingest,
    sweepLostStreams,
    // exported for tests
    LOCK_DEG,
    NEARLY_DEG,
    CLOSE_DEG,
    LOCK_HOLD_MS,
    UNLOCK_FACTOR,
    __testing: { nextState, scoreConfidence, stampEphemeris, sessions },
};
