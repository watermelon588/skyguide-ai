import {
  circularDelta,
  normalizeHeading,
} from "../../../services/orientation/orientationMath.js";

/**
 * Alignment Mode scene state — a pure JS interpolation store, zero React,
 * zero canvas. Packets arrive at ≤10Hz; step() integrates at frame rate so
 * every drawn value moves on springs/exponentials instead of jumping.
 *
 * This is PRESENTATION math only (springs, easing, screen mapping). All
 * science stays on the backend: the store consumes the streamed errors
 * verbatim and never computes astronomy.
 *
 * Core mapping (spec: the visual can never contradict the state machine):
 *   direction θ = atan2(horizontal_error, vertical_error)  (0° = up/12
 *   o'clock, clockwise) — +horizontal → right, +vertical → up.
 *   distance    = angular_error (great-circle truth) × pxPerDeg.
 * θ and the radius are interpolated separately: a circular spring keeps the
 * bearing from whipping the long way around 0/360, a linear spring keeps the
 * approach overshoot-free (overshoot on data would be a lie).
 */

// Critically damped spring stiffness (omega = sqrt(k)); zero overshoot.
const OMEGA = 11;
const OMEGA_REDUCED = 5; // heavier damping when reduced motion is on

// FOV per stage: degrees of sky across the vmin dimension. The "near" FOV is
// dynamic — tuned so 1° of error lands exactly ON the Iris ring (the ring IS
// the lock threshold).
const FOV_SEARCHING = 70;
const FOV_CLOSE = 24;

// Exponential time constants (seconds).
const TAU_FOV_IN = 0.6; // zooming in — regaining ground feels quick
const TAU_FOV_OUT = 0.9; // zooming out — losing ground feels soft
const TAU_BLOOM = 0.3;
const TAU_RING_COLOR = 0.4;
const TAU_CONFIDENCE = 1.0;
const TAU_FOCUS_OUT = 0.8; // lost-stream defocus
const TAU_FOCUS_IN = 0.3;
const TAU_DIM = 0.3;
const TAU_REDUCED = 0.12; // reduced motion: stages become quick crossfades

// Lock-hold tick ring (mirrors the backend's 600ms hold; fill caps below 1
// and completes ONLY on the authoritative locked state).
const TICK_FILL_S = 0.6;
const TICK_DRAIN_S = 0.3;
const TICK_SNAP_S = 0.08;
const TICK_FILL_CAP = 0.9;
const LOCK_ZONE_DEG = 1.0;

const PULSE_MS = 250; // gate-pass ring pulse
const RIPPLE_MS = 600; // lock ripple 1.0× → 2.2×
const HEARTBEAT_TAU = 0.15;

// Parallax dust: two depths, fraction of true angular motion.
const DUST_DEPTHS = [0.5, 0.25];

function expApproach(current, goal, tau, dt) {
  return current + (goal - current) * (1 - Math.exp(-dt / tau));
}

function springStep(s, dt, omega) {
  // Semi-implicit Euler on a critically damped spring — stable for the
  // dt ≤ 50ms the loop clamps to.
  s.v += (-2 * omega * s.v - omega * omega * (s.x - s.target)) * dt;
  s.x += s.v * dt;
}

const clamp01 = (v) => Math.max(0, Math.min(1, v));

export function createSceneState() {
  const S = {
    // Target position (polar, degrees) — drawn as radius × pxPerDeg at θ.
    theta: { x: 0, v: 0, target: 0 },
    radius: { x: 0, v: 0, target: 0 },
    cometTheta: { x: 0, v: 0, target: 0 },
    cometAlpha: 0,
    fov: FOV_SEARCHING,
    pxPerDeg: 8,
    closeness: 0, // ring white→orange mix
    lockMix: 0, // ring →green mix
    ticksAlpha: 0,
    tickFill: 0,
    bloom: 0,
    beat: 0,
    confidence: 80,
    focus: 1, // 0 = fully defocused (lost stream)
    dim: 1,
    horizonAlpha: 0,
    pitchSmooth: 0,
    dust: DUST_DEPTHS.map(() => ({ x: 0, y: 0 })),
    pulseAt: -1e9, // epoch ms of the last gate-pass pulse
    rippleAt: -1e9, // epoch ms of the lock ripple
    targetVisible: false,
    state: null,
    unreferenced: false,
    belowHorizon: false,
    hasPacket: false,

    _lastState: null,
    _lastPacketT: null,
    _lastHeading: null,
    _lastPitch: null,
  };

  /**
   * Advance the scene by dt seconds.
   *
   * @param {number} dt        seconds since last frame (caller clamps)
   * @param {object|null} packet  latest alignment:update, or null
   * @param {object} mode      { frozen, dim, unreferenced, belowHorizon,
   *                             reducedMotion, guidance } — written by React
   * @param {object} size      { w, h, vmin, ringRadius } CSS px
   * @param {number} now       epoch ms
   */
  function step(dt, packet, mode, size, now) {
    const reduced = !!mode.reducedMotion;
    const frozen = !!mode.frozen;
    const omega = reduced ? OMEGA_REDUCED : OMEGA;

    S.unreferenced = !!mode.unreferenced;
    S.belowHorizon = !!mode.belowHorizon;
    S.dim = expApproach(S.dim, mode.dim ?? 1, TAU_DIM, dt);
    S.focus = expApproach(S.focus, frozen ? 0 : 1, frozen ? TAU_FOCUS_OUT : TAU_FOCUS_IN, dt);
    S.horizonAlpha = expApproach(S.horizonAlpha, S.belowHorizon ? 1 : 0, 0.4, dt);

    if (packet && !frozen) {
      S.hasPacket = true;
      S.state = packet.state ?? S.state;

      // --- Retarget springs from the streamed truth --------------------
      const h = packet.horizontal_error ?? 0;
      const v = packet.vertical_error ?? 0;
      const ang = packet.angular_error ?? 0;

      const thetaDeg = normalizeHeading((Math.atan2(h, v) * 180) / Math.PI);
      // Circular spring: retarget to the wrap-nearest representation so
      // 359° → 1° travels 2°, never 358° the long way.
      S.theta.target = S.theta.x + circularDelta(thetaDeg, normalizeHeading(S.theta.x));
      S.radius.target = ang;

      const cometGoal = S.unreferenced ? (v >= 0 ? 0 : 180) : thetaDeg;
      S.cometTheta.target =
        S.cometTheta.x + circularDelta(cometGoal, normalizeHeading(S.cometTheta.x));

      // --- Heartbeat on every fresh packet -----------------------------
      if (packet.t !== S._lastPacketT) {
        S._lastPacketT = packet.t;
        if (!reduced) S.beat = 1;
      }

      // --- Gate-pass pulse + lock ripple on state transitions ----------
      if (packet.state !== S._lastState) {
        const upward =
          (S._lastState === "searching" && packet.state === "close") ||
          (S._lastState === "close" && packet.state === "nearly_aligned") ||
          packet.state === "locked";
        if (upward && !reduced) S.pulseAt = now;
        if (packet.state === "locked" && !reduced) S.rippleAt = now;
        S._lastState = packet.state;
      }

      // --- Dust parallax from scope motion (screen mapping only) -------
      const heading = packet.telescope?.heading;
      const pitch = packet.telescope?.pitch;
      if (!reduced && Number.isFinite(heading) && Number.isFinite(pitch)) {
        if (S._lastHeading != null) {
          const dH = circularDelta(heading, S._lastHeading);
          const dP = pitch - S._lastPitch;
          for (let i = 0; i < DUST_DEPTHS.length; i++) {
            // Turn right → the sky slides left; look up → the sky slides down.
            S.dust[i].x -= dH * S.pxPerDeg * DUST_DEPTHS[i];
            S.dust[i].y += dP * S.pxPerDeg * DUST_DEPTHS[i];
          }
        }
        S._lastHeading = heading;
        S._lastPitch = pitch;
      }

      S.confidence = expApproach(S.confidence, packet.confidence ?? 50, TAU_CONFIDENCE, dt);
      S.pitchSmooth = expApproach(S.pitchSmooth, pitch ?? S.pitchSmooth, 0.3, dt);
    }

    // --- FOV stage (the zoom IS the progress indicator) -----------------
    const fovNear = size.ringRadius > 0 ? size.vmin / size.ringRadius : 8;
    const stageFov =
      S.state === "close"
        ? FOV_CLOSE
        : S.state === "nearly_aligned" || S.state === "locked"
          ? fovNear
          : FOV_SEARCHING;
    const zoomingIn = stageFov < S.fov;
    S.fov = expApproach(
      S.fov,
      stageFov,
      reduced ? TAU_REDUCED : zoomingIn ? TAU_FOV_IN : TAU_FOV_OUT,
      dt,
    );
    S.pxPerDeg = size.vmin / S.fov;

    // --- Springs ---------------------------------------------------------
    springStep(S.theta, dt, omega);
    springStep(S.radius, dt, omega);
    if (S.radius.x < 0) {
      S.radius.x = 0;
      S.radius.v = Math.max(0, S.radius.v);
    }
    springStep(S.cometTheta, dt, reduced ? 3 : 8);

    // --- Visibility: geometric, from the interpolated position ----------
    const radiusPx = S.radius.x * S.pxPerDeg;
    const maxR = Math.min(size.w, size.h) / 2 - 24;
    S.targetVisible = S.hasPacket && radiusPx < maxR;

    // --- Atmosphere ------------------------------------------------------
    const wantComet =
      S.hasPacket && !S.targetVisible && !frozen && !S.belowHorizon ? 1 : 0;
    S.cometAlpha = expApproach(S.cometAlpha, wantComet, TAU_BLOOM, dt);

    const wantBloom =
      S.hasPacket && !S.targetVisible && !frozen && !S.belowHorizon
        ? 0.15 + 0.85 * clamp01(1 - S.radius.x / 90)
        : 0;
    S.bloom = expApproach(S.bloom, wantBloom, TAU_BLOOM, dt);

    const wantCloseness =
      S.state === "close" || S.state === "nearly_aligned" || S.state === "locked"
        ? clamp01(1 - S.radius.x / 10)
        : 0;
    S.closeness = expApproach(S.closeness, wantCloseness, TAU_RING_COLOR, dt);
    S.lockMix = expApproach(S.lockMix, S.state === "locked" ? 1 : 0, 0.25, dt);

    const wantTicks =
      S.state === "nearly_aligned" || S.state === "locked" ? 1 : 0;
    S.ticksAlpha = expApproach(S.ticksAlpha, wantTicks, 0.2, dt);

    // --- Lock-hold tick fill (authoritative completion only) -------------
    const inZone =
      !frozen && S.hasPacket && packet && (packet.angular_error ?? 99) <= LOCK_ZONE_DEG;
    if (S.state === "locked") {
      S.tickFill = Math.min(1, S.tickFill + dt / TICK_SNAP_S);
    } else if (inZone) {
      S.tickFill = Math.min(TICK_FILL_CAP, S.tickFill + (TICK_FILL_CAP * dt) / TICK_FILL_S);
    } else {
      S.tickFill = Math.max(0, S.tickFill - dt / TICK_DRAIN_S);
    }

    S.beat *= Math.exp(-dt / HEARTBEAT_TAU);
  }

  /** Pulse/ripple progress helpers for the painter (0..1, or -1 if idle). */
  function pulseT(now) {
    const t = (now - S.pulseAt) / PULSE_MS;
    return t >= 0 && t <= 1 ? t : -1;
  }
  function rippleT(now) {
    const t = (now - S.rippleAt) / RIPPLE_MS;
    return t >= 0 && t <= 1 ? t : -1;
  }

  return Object.assign(S, { step, pulseT, rippleT });
}
