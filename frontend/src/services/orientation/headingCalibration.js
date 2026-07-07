import { circularDelta, normalizeHeading } from "./orientationMath.js";

/**
 * Heading reference calibration — pure state machine, zero browser APIs.
 *
 * The pitch/roll half of orientation is self-referencing (gravity), but
 * heading needs a NORTH REFERENCE, and browsers disagree on providing one:
 *
 *  - Android Chrome: deviceorientationabsolute is already magnetometer-fused
 *    by the OS → source "absolute", no offset needed.
 *  - iOS Safari: alpha has an ARBITRARY zero, but webkitCompassHeading gives
 *    magnetic heading of the device top → we maintain a smoothed alpha
 *    offset against it (source "compass").
 *  - No compass at all (desktop, some browsers): heading is relative to
 *    wherever the session started → source "none", status "unreferenced".
 *
 * Output: an alpha correction (degrees to ADD to raw alpha) plus a
 * status/quality assessment future systems can trust blindly.
 *
 * Statuses: "calibrated" | "degraded" | "unreferenced" | "initializing"
 * Sources:  "absolute" | "compass" | "none"
 */

// EMA factor for the compass offset — slow on purpose: the gyro-continuous
// alpha provides smoothness, the compass only pins the reference.
const OFFSET_SMOOTHING = 0.05;
// A sudden reference jump beyond this means the old offset was wrong
// (magnetic disturbance passed, sensor re-fused) → snap instead of drift.
const SNAP_THRESHOLD_DEG = 25;
// iOS compassAccuracy (deg, -1 = invalid): thresholds for quality tiers.
const ACCURACY_GOOD_DEG = 15;
const ACCURACY_FAIR_DEG = 35;
// Without fresh compass input for this long, confidence in the offset decays.
const REFERENCE_TIMEOUT_MS = 10000;

export function createHeadingCalibration() {
  let source = "none";
  let offset = 0; // degrees to add to raw alpha
  let hasOffset = false;
  let lastCompassAt = null;
  let lastAccuracy = null;
  let samples = 0;

  return {
    /**
     * Feed one orientation sample (pre-quaternion).
     * @param {{ alpha: number|null, absolute: boolean,
     *           compassHeading: number|null, compassAccuracy: number|null,
     *           at: number }} s
     */
    ingest(s) {
      samples += 1;

      if (s.absolute) {
        // OS-fused absolute orientation — authoritative, no correction.
        source = "absolute";
        offset = 0;
        hasOffset = true;
        lastCompassAt = s.at;
        return;
      }

      if (s.compassHeading != null && s.alpha != null) {
        source = "compass";
        lastCompassAt = s.at;
        lastAccuracy = s.compassAccuracy;
        // webkitCompassHeading is clockwise-from-north; alpha counterclockwise:
        // a perfectly referenced alpha would be (360 − compassHeading).
        const target = circularDelta(360 - s.compassHeading, s.alpha);
        if (!hasOffset || Math.abs(circularDelta(target, offset)) > SNAP_THRESHOLD_DEG) {
          offset = target;
          hasOffset = true;
        } else {
          offset += circularDelta(target, offset) * OFFSET_SMOOTHING;
          offset = normalizeHeading(offset);
        }
        return;
      }

      if (source === "none") hasOffset = false;
    },

    /** Degrees to add to raw alpha before building the quaternion. */
    getOffset() {
      return hasOffset ? offset : 0;
    },

    /**
     * @param {number} now epoch ms
     * @returns {{ status: string, source: string, quality: string|null }}
     */
    getState(now) {
      if (samples < 3) {
        return { status: "initializing", source, quality: null };
      }
      if (source === "absolute") {
        return { status: "calibrated", source, quality: "high" };
      }
      if (source === "compass") {
        const stale =
          lastCompassAt != null && now - lastCompassAt > REFERENCE_TIMEOUT_MS;
        const acc = lastAccuracy;
        const accInvalid = acc == null || acc < 0;
        const quality = accInvalid
          ? "medium"
          : acc <= ACCURACY_GOOD_DEG
            ? "high"
            : acc <= ACCURACY_FAIR_DEG
              ? "medium"
              : "low";
        return {
          status: stale || quality === "low" ? "degraded" : "calibrated",
          source,
          quality,
        };
      }
      // No north reference: heading is consistent but relative.
      return { status: "unreferenced", source: "none", quality: null };
    },

    reset() {
      source = "none";
      offset = 0;
      hasOffset = false;
      lastCompassAt = null;
      lastAccuracy = null;
      samples = 0;
    },
  };
}
