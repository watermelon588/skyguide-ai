/**
 * Alignment math + state machine tests (Session 14).
 * Run: node --test tests/
 *
 * The math here IS the product — a sign error sends the user's telescope the
 * wrong way, so every convention is pinned by a test.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    normalizeDeg,
    circularDeltaDeg,
    angularSeparationDeg,
    pointingError,
    extrapolateEphemeris,
} = require("../src/utils/alignmentMath");

const engine = require("../src/services/alignmentEngine");
const { nextState, scoreConfidence } = engine.__testing;

// --------------------------------------------------------------------------
test("normalizeDeg wraps into 0..360", () => {
    assert.equal(normalizeDeg(0), 0);
    assert.equal(normalizeDeg(360), 0);
    assert.equal(normalizeDeg(-10), 350);
    assert.equal(normalizeDeg(725), 5);
});

test("circularDeltaDeg takes the short way around", () => {
    assert.equal(circularDeltaDeg(10, 350), 20); // across north
    assert.equal(circularDeltaDeg(350, 10), -20);
    assert.equal(circularDeltaDeg(180, 0), 180);
    assert.equal(circularDeltaDeg(0, 0), 0);
});

test("angularSeparationDeg matches known geometry", () => {
    // Same point → 0.
    assert.ok(angularSeparationDeg(120, 45, 120, 45) < 1e-9);
    // Pure altitude difference on the same azimuth.
    assert.ok(Math.abs(angularSeparationDeg(90, 10, 90, 40) - 30) < 1e-9);
    // Two points on the horizon 90° of azimuth apart.
    assert.ok(Math.abs(angularSeparationDeg(0, 0, 90, 0) - 90) < 1e-9);
    // At high altitude an azimuth gap shrinks: cos(80°) foreshortening.
    const sep = angularSeparationDeg(0, 80, 90, 80);
    assert.ok(sep < 20 && sep > 13, `got ${sep}`);
    // Zenith to horizon is 90° regardless of azimuth.
    assert.ok(Math.abs(angularSeparationDeg(17, 90, 200, 0) - 90) < 1e-9);
});

test("angularSeparationDeg is stable near zero (lock regime)", () => {
    const sep = angularSeparationDeg(100, 30, 100.01, 30.01);
    assert.ok(sep > 0.01 && sep < 0.02, `got ${sep}`);
});

test("pointingError signs mean 'degrees the telescope must move'", () => {
    // Target east (az 90) of the scope (az 80) → positive horizontal error.
    // Target above the scope → positive vertical error.
    const e = pointingError({ heading: 80, pitch: 20, targetAz: 90, targetAlt: 25 });
    assert.equal(e.horizontalError, 10);
    assert.equal(e.verticalError, 5);
    assert.ok(e.angularError > 0);

    // Across the north wrap: scope at 350°, target at 10° → +20 (clockwise).
    const w = pointingError({ heading: 350, pitch: 0, targetAz: 10, targetAlt: 0 });
    assert.equal(w.horizontalError, 20);
});

test("extrapolateEphemeris advances linearly and wraps azimuth", () => {
    const eph = {
        altitude_deg: 45,
        azimuth_deg: 359.5,
        altitude_rate_deg_s: 0.002,
        azimuth_rate_deg_s: 0.01,
    };
    const p = extrapolateEphemeris(eph, 100);
    assert.ok(Math.abs(p.altitude - 45.2) < 1e-9);
    assert.ok(Math.abs(p.azimuth - 0.5) < 1e-9); // wrapped past north
    // Altitude clamps at the pole.
    const q = extrapolateEphemeris({ ...eph, altitude_deg: 89.9, altitude_rate_deg_s: 1 }, 100);
    assert.equal(q.altitude, 90);
});

// --------------------------------------------------------------------------
function freshSession(state = "searching") {
    return { state, lockCandidateSince: null, unlockCandidateSince: null };
}

test("state machine: thresholds map to states", () => {
    const s = freshSession();
    assert.equal(nextState(s, 45, true, 0), "searching");
    assert.equal(nextState(s, 8, true, 0), "close");
    assert.equal(nextState(s, 2, true, 0), "nearly_aligned");
});

test("state machine: lock requires sustained hold", () => {
    const s = freshSession();
    // First packet inside the lock zone: candidate, not locked yet.
    assert.equal(nextState(s, 0.5, true, 1000), "nearly_aligned");
    // Still inside before the hold elapses.
    assert.equal(nextState(s, 0.4, true, 1000 + engine.LOCK_HOLD_MS - 1), "nearly_aligned");
    // Hold satisfied → locked.
    assert.equal(nextState(s, 0.4, true, 1000 + engine.LOCK_HOLD_MS), "locked");
});

test("state machine: lock hysteresis prevents boundary strobing", () => {
    const s = freshSession("locked");
    // Slightly outside LOCK_DEG but inside the release band → stays locked.
    assert.equal(nextState(s, engine.LOCK_DEG * 1.3, true, 0), "locked");
    // Outside the release band, but only momentarily → still locked (the
    // release needs UNLOCK_HOLD_MS of sustained excursion).
    const s2 = freshSession("locked");
    const beyond = engine.LOCK_DEG * engine.UNLOCK_FACTOR + 1;
    assert.equal(nextState(s2, beyond, true, 0), "locked");
    assert.equal(
        nextState(s2, beyond, true, engine.UNLOCK_HOLD_MS - 1),
        "locked",
    );
    // Sustained excursion past the hold → drops out (3.4° → "close").
    assert.equal(nextState(s2, beyond, true, engine.UNLOCK_HOLD_MS), "close");
});

test("state machine: returning inside the band cancels a pending release", () => {
    const s = freshSession("locked");
    const beyond = engine.LOCK_DEG * engine.UNLOCK_FACTOR + 1;
    nextState(s, beyond, true, 0); // excursion starts
    nextState(s, 0.5, true, 500); // back inside → release cancelled
    // A later excursion starts its own clock; the old one must not count.
    assert.equal(nextState(s, beyond, true, 600), "locked");
    assert.equal(nextState(s, beyond, true, 600 + engine.UNLOCK_HOLD_MS - 1), "locked");
});

test("state machine: a wobble outside the zone resets the hold timer", () => {
    const s = freshSession();
    nextState(s, 0.5, true, 0); // candidate starts
    nextState(s, 5, true, 300); // leaves the zone → candidate reset
    assert.equal(nextState(s, 0.5, true, 400), "nearly_aligned");
    // Only 500ms after RE-entry (900) would lock; at 800 it must not.
    assert.equal(nextState(s, 0.5, true, 400 + engine.LOCK_HOLD_MS - 1), "nearly_aligned");
    assert.equal(nextState(s, 0.5, true, 400 + engine.LOCK_HOLD_MS), "locked");
});

test("state machine: below horizon overrides everything", () => {
    assert.equal(nextState(freshSession("locked"), 0.1, false, 0), "below_horizon");
});

test("error damping: converges and wraps horizontal at ±180°", () => {
    const { smoothErrors } = engine.__testing;
    const s = { smoothed: null };
    const first = smoothErrors(
        s,
        { horizontalError: 179, verticalError: 0, angularError: 179 },
        0,
    );
    assert.equal(first.horizontal, 179); // first sample passes through

    // A jump to -179 is a 2° move across the wrap, not a 358° swing — the
    // damped value must head toward ±180, not toward zero.
    const next = smoothErrors(
        s,
        { horizontalError: -179, verticalError: 0, angularError: 179 },
        100,
    );
    assert.ok(Math.abs(next.horizontal) > 178, `wrapped: ${next.horizontal}`);

    // With time, the estimate converges to the input.
    let out = next;
    for (let t = 200; t <= 3000; t += 100) {
        out = smoothErrors(
            s,
            { horizontalError: -179, verticalError: 0, angularError: 179 },
            t,
        );
    }
    assert.ok(Math.abs(wrap180(out.horizontal - -179)) < 0.5);
});

function wrap180(d) {
    let x = d;
    if (x > 180) x -= 360;
    else if (x < -180) x += 360;
    return x;
}

test("confidence: no north reference caps the score", () => {
    const model = (conf, source, status) => ({
        confidence: conf,
        calibration: { source, status },
    });
    assert.ok(scoreConfidence(model("high", "absolute", "calibrated"), 0, 60) >= 90);
    assert.ok(scoreConfidence(model("high", "none", "unreferenced"), 0, 60) <= 30);
    // Stale ephemeris degrades but never goes negative.
    const stale = scoreConfidence(model("low", "compass", "degraded"), 10000, 60);
    assert.ok(stale >= 0 && stale < 45);
});
