/**
 * Sensor acquisition engine — pure browser-API layer, zero React.
 *
 * Owns capability detection, the iOS permission flow, event listener
 * lifecycle, and a latest-sample store. The streaming hook (useSensorStream)
 * decides WHEN to sample and emit; this module only answers "what are the
 * sensors saying right now".
 *
 * Browser landscape this normalizes over:
 *  - iOS Safari 13+: requestPermission() gates both APIs, must be called
 *    from a user gesture; compass arrives as webkitCompassHeading.
 *  - Android Chrome: no permission prompt, but events are silently withheld
 *    on insecure (http) origins — hence the first-event probe.
 *  - Chrome exposes deviceorientationabsolute (compass-referenced alpha);
 *    preferred over the relative deviceorientation when available.
 */

// How long to wait for a first event before declaring a sensor unavailable.
// Real devices emit within ~100ms of attach; 1.5s absorbs slow wakes.
const PROBE_TIMEOUT_MS = 1500;

function round(value, decimals = 3) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function vec(v) {
  if (!v || (v.x == null && v.y == null && v.z == null)) return null;
  return { x: round(v.x), y: round(v.y), z: round(v.z) };
}

function needsExplicitPermission() {
  return (
    typeof window.DeviceOrientationEvent?.requestPermission === "function" ||
    typeof window.DeviceMotionEvent?.requestPermission === "function"
  );
}

/**
 * One-shot capability probe, safe to call before any permission prompt.
 *
 * @returns {"unsupported"|"insecure_context"|"needs_permission"|"auto"}
 *   "auto" = no explicit prompt required (Android/desktop); listeners can be
 *   attached immediately and the first-event probe confirms delivery.
 */
export function getSensorCapability() {
  if (typeof window === "undefined") return "unsupported";

  const hasOrientation = "DeviceOrientationEvent" in window;
  const hasMotion = "DeviceMotionEvent" in window;
  if (!hasOrientation && !hasMotion) return "unsupported";

  // Chrome and Safari withhold motion events on insecure origins (e.g. LAN
  // http). Surface an explicit state instead of a silently empty stream.
  if (!window.isSecureContext) return "insecure_context";

  return needsExplicitPermission() ? "needs_permission" : "auto";
}

/**
 * iOS permission flow. MUST be called from a user gesture handler.
 * Orientation and motion are granted independently — proceed if either
 * succeeds so a partial device still streams what it has.
 *
 * @returns {Promise<"granted"|"denied">}
 */
export async function requestSensorPermission() {
  const gated = [window.DeviceOrientationEvent, window.DeviceMotionEvent].filter(
    (api) => typeof api?.requestPermission === "function",
  );
  if (gated.length === 0) return "granted";

  const results = [];
  for (const api of gated) {
    try {
      results.push(await api.requestPermission());
    } catch {
      // Thrown when not user-initiated or blocked by settings.
      results.push("denied");
    }
  }
  return results.includes("granted") ? "granted" : "denied";
}

function screenInfo() {
  if (typeof window === "undefined") return null;
  const orientation = window.screen?.orientation;
  if (orientation) {
    return { angle: orientation.angle ?? null, type: orientation.type ?? null };
  }
  // Legacy iOS fallback.
  if (typeof window.orientation === "number") {
    return { angle: window.orientation, type: null };
  }
  return null;
}

/**
 * Creates a start/stop-able engine that keeps only the LATEST sample per
 * sensor group. Listeners run at native rate (~60Hz) writing into plain
 * variables; snapshot() is the cheap read the emit loop calls at 20Hz.
 */
export function createSensorEngine() {
  let latestOrientation = null;
  let latestMotion = null;
  let orientationSeen = false;
  let motionSeen = false;
  let probeTimer = null;
  let running = false;

  // Compass-referenced alpha when the browser offers it.
  const orientationEventName =
    typeof window !== "undefined" && "ondeviceorientationabsolute" in window
      ? "deviceorientationabsolute"
      : "deviceorientation";

  function handleOrientation(event) {
    orientationSeen = true;
    latestOrientation = {
      alpha: round(event.alpha),
      beta: round(event.beta),
      gamma: round(event.gamma),
      absolute: event.absolute === true,
      // iOS-only compass fields; null elsewhere.
      compassHeading: round(event.webkitCompassHeading),
      compassAccuracy: round(event.webkitCompassAccuracy),
    };
  }

  function handleMotion(event) {
    motionSeen = true;
    latestMotion = {
      acc: vec(event.acceleration),
      accG: vec(event.accelerationIncludingGravity),
      rot: event.rotationRate
        ? {
            alpha: round(event.rotationRate.alpha),
            beta: round(event.rotationRate.beta),
            gamma: round(event.rotationRate.gamma),
          }
        : null,
      interval: round(event.interval, 1),
    };
  }

  return {
    /**
     * Attach listeners and start the first-event probe.
     * @param {{ onAvailability?: (a: {orientation: boolean, motion: boolean}) => void }} opts
     *   onAvailability fires once, after PROBE_TIMEOUT_MS, reporting which
     *   sensor groups actually delivered events (catches silent blocking).
     */
    start({ onAvailability } = {}) {
      if (running || typeof window === "undefined") return;
      running = true;
      orientationSeen = false;
      motionSeen = false;

      window.addEventListener(orientationEventName, handleOrientation);
      window.addEventListener("devicemotion", handleMotion);

      probeTimer = setTimeout(() => {
        probeTimer = null;
        if (running && onAvailability) {
          onAvailability({ orientation: orientationSeen, motion: motionSeen });
        }
      }, PROBE_TIMEOUT_MS);
    },

    stop() {
      if (!running) return;
      running = false;
      window.removeEventListener(orientationEventName, handleOrientation);
      window.removeEventListener("devicemotion", handleMotion);
      if (probeTimer) {
        clearTimeout(probeTimer);
        probeTimer = null;
      }
      latestOrientation = null;
      latestMotion = null;
    },

    /** Latest values per group — null until that sensor has fired. */
    snapshot() {
      return {
        orientation: latestOrientation,
        motion: latestMotion,
        screen: screenInfo(),
      };
    },
  };
}
