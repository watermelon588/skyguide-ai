import {
  quatFromDeviceEuler,
  screenAdjust,
  anglesFromQuat,
  quatSmooth,
  quatAngleDeg,
  normalizeHeading,
} from "./orientationMath.js";
import { createHeadingCalibration } from "./headingCalibration.js";

/**
 * Orientation engine — the single place raw browser sensor samples become a
 * stable, calibrated, device-independent orientation model. Pure JS state
 * machine (no browser APIs, no React): callers push samples in, snapshot()
 * hands back the model. Everything downstream — streaming, alignment, the
 * future AI copilot — consumes the model, never raw events.
 *
 * Pipeline per sample:
 *   validate → heading calibration (alpha correction) → quaternion (ZXY) →
 *   screen-rotation adjust → adaptive smoothing → angles + confidence
 *
 * Smoothing is a complementary-style adaptive nlerp: when the device is
 * still, a small blend factor suppresses sensor noise; when the gyro (or the
 * quaternion delta itself) shows real motion, the factor rises so the
 * estimate tracks without lag. Stability > raw responsiveness, per spec.
 */

// Blend factor bounds and gain. At ~60Hz input: k=0.10 settles noise hard,
// k=0.85 is near-passthrough during fast slews.
const SMOOTH_K_MIN = 0.1;
const SMOOTH_K_MAX = 0.85;
const SMOOTH_GAIN = 1 / 120; // +k per (deg/s) of angular velocity
// EMA factor for the input-rate estimate.
const RATE_SMOOTHING = 0.1;
// Jitter = mean deviation of angular velocity from its own average (deg/s).
// Noise makes velocity erratic; a smooth intentional slew keeps it steady —
// so this flags noisy sensors without punishing deliberate motion.
const JITTER_NOISY_DEG_S = 8;
// Samples required before the estimate is trusted at all.
const WARMUP_SAMPLES = 8;
// No orientation input for this long → the model is stale and must not be
// served (a frozen-but-live-looking orientation is worse than none).
const STALE_INPUT_MS = 1500;

export function createOrientationEngine() {
  const calibration = createHeadingCalibration();

  let qFiltered = null;
  let qRawPrev = null;
  let samples = 0;
  let lastSampleAt = null;
  let inputRateHz = 0;
  let gyroRateDegS = null; // |rotationRate| from devicemotion when available
  let velocityEma = 0; // EMA of quat-delta angular velocity (deg/s)
  let jitterDegS = 0; // EMA of |velocity − velocityEma| — noise, not motion

  function angularVelocity(qRaw, dtMs) {
    if (!qRawPrev || dtMs <= 0) return 0;
    return (quatAngleDeg(qRaw, qRawPrev) / dtMs) * 1000;
  }

  return {
    /**
     * One DeviceOrientation sample.
     * @param {{ alpha, beta, gamma, absolute, compassHeading,
     *           compassAccuracy, screenAngle, at }} s  angles in deg, at = epoch ms
     */
    ingestOrientation(s) {
      if (s.alpha == null && s.beta == null && s.gamma == null) return;

      const dtMs = lastSampleAt != null ? s.at - lastSampleAt : null;
      lastSampleAt = s.at;
      samples += 1;
      if (dtMs != null && dtMs > 0 && dtMs < 1000) {
        const hz = 1000 / dtMs;
        inputRateHz += (hz - inputRateHz) * RATE_SMOOTHING;
      }

      calibration.ingest({
        alpha: s.alpha,
        absolute: s.absolute === true,
        compassHeading: s.compassHeading ?? null,
        compassAccuracy: s.compassAccuracy ?? null,
        at: s.at,
      });

      const alphaCal =
        s.alpha != null
          ? normalizeHeading(s.alpha + calibration.getOffset())
          : null;

      const qRaw = screenAdjust(
        quatFromDeviceEuler(alphaCal, s.beta, s.gamma),
        s.screenAngle ?? 0,
      );

      // Angular velocity: prefer the gyro (clean), fall back to quat delta.
      const quatVel = angularVelocity(qRaw, dtMs ?? 0);
      const velocity = gyroRateDegS ?? quatVel;
      velocityEma += (quatVel - velocityEma) * 0.1;
      jitterDegS += (Math.abs(quatVel - velocityEma) - jitterDegS) * 0.05;
      qRawPrev = qRaw;

      const k = Math.min(
        SMOOTH_K_MAX,
        SMOOTH_K_MIN + velocity * SMOOTH_GAIN,
      );
      qFiltered = quatSmooth(qFiltered, qRaw, k);
    },

    /** Optional gyro feed (devicemotion rotationRate, deg/s). */
    ingestRotationRate(rot) {
      if (!rot || rot.alpha == null) {
        gyroRateDegS = null;
        return;
      }
      gyroRateDegS = Math.hypot(rot.alpha ?? 0, rot.beta ?? 0, rot.gamma ?? 0);
    },

    /**
     * Current orientation model, or null when nothing trustworthy exists
     * (never serves a stale/frozen estimate).
     * @param {number} now epoch ms
     */
    snapshot(now) {
      if (!qFiltered || samples === 0) return null;
      if (lastSampleAt != null && now - lastSampleAt > STALE_INPUT_MS) {
        return null;
      }

      const cal = calibration.getState(now);
      const { heading, pitch, roll, gimbal } = anglesFromQuat(qFiltered);

      let confidence;
      if (samples < WARMUP_SAMPLES || cal.status === "initializing") {
        confidence = "initializing";
      } else if (inputRateHz < 5 || jitterDegS > JITTER_NOISY_DEG_S) {
        confidence = "low";
      } else if (cal.status === "unreferenced" || cal.status === "degraded") {
        confidence = "medium";
      } else {
        confidence = "high";
      }

      return {
        quaternion: {
          w: round(qFiltered.w, 5),
          x: round(qFiltered.x, 5),
          y: round(qFiltered.y, 5),
          z: round(qFiltered.z, 5),
        },
        heading: round(heading, 2),
        pitch: round(pitch, 2),
        roll: round(roll, 2),
        gimbal, // roll reference switched near the zenith/nadir
        confidence,
        calibration: {
          status: cal.status,
          source: cal.source,
          quality: cal.quality,
          offset: round(calibration.getOffset(), 1),
        },
        inputRateHz: round(inputRateHz, 1),
      };
    },

    reset() {
      calibration.reset();
      qFiltered = null;
      qRawPrev = null;
      samples = 0;
      lastSampleAt = null;
      inputRateHz = 0;
      gyroRateDegS = null;
      velocityEma = 0;
      jitterDegS = 0;
    },
  };
}

function round(v, d) {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  const f = 10 ** d;
  return Math.round(v * f) / f;
}
