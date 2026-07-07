import { useCallback, useEffect, useRef, useState } from "react";
import { usePairing } from "../context/PairingContext";
import {
  createSensorEngine,
  getSensorCapability,
  requestSensorPermission,
} from "../services/sensor.service";
import { createOrientationEngine } from "../services/orientation/orientationEngine";
import { quatAngleDeg } from "../services/orientation/orientationMath";

/**
 * Phone-side orientation streaming lifecycle (mounted on /align).
 * Supersedes Session 12's useSensorStream: raw sensor events now feed the
 * orientation engine ON the phone, and only the normalized orientation model
 * is transmitted — the dashboard never sees a browser event.
 *
 *   sensor.service (native-rate events) → orientationEngine (calibrate,
 *   smooth, score) → ≤20Hz `orientation_update` emit with change-dedup
 *
 * Dedup: a resting phone produces near-identical models; those are skipped
 * and a low-rate keepalive maintains liveness, so socket traffic tracks
 * actual motion. Nothing per-frame touches React state — the phone UI gets
 * a 4Hz digest (heading/pitch/confidence) for its own display only.
 *
 * Same self-healing as Session 12: keyed off pairing.status, pauses on
 * visibilitychange, re-arms after reconnect, full listener cleanup.
 */

const TARGET_HZ = 20;
const EMIT_INTERVAL_MS = Math.round(1000 / TARGET_HZ);
const PACKET_VERSION = 1;
// Emit when the estimate moved at least this much since the last packet…
const EMIT_MIN_ANGLE_DEG = 0.15;
// …or this long has passed (keepalive so the dashboard can judge liveness).
const KEEPALIVE_MS = 500;
// Phone-UI digest cadence.
const DISPLAY_COMMIT_MS = 250;

const INITIAL_SENSORS = { orientation: "pending", motion: "pending" };

function readScreenAngle() {
  if (typeof window === "undefined") return 0;
  const angle = window.screen?.orientation?.angle;
  if (typeof angle === "number") return angle;
  return typeof window.orientation === "number" ? window.orientation : 0;
}

export function useOrientationStream() {
  const { pairing, socketRef } = usePairing();
  const paired = pairing.status === "connected";

  // "checking" | "insecure_context" | "unsupported" | "needs_permission"
  // | "requesting" | "granted" | "denied"
  const [permission, setPermission] = useState("checking");
  const [streaming, setStreaming] = useState(false);
  const [paused, setPaused] = useState(false);
  const [sensors, setSensors] = useState(INITIAL_SENSORS);
  // Low-frequency digest for the phone's own display.
  const [display, setDisplay] = useState(null);

  const seqRef = useRef(0);

  useEffect(() => {
    const capability = getSensorCapability();
    setPermission(capability === "auto" ? "granted" : capability);
  }, []);

  /** iOS entry point — must be invoked from a user gesture (button tap). */
  const enableSensors = useCallback(async () => {
    setPermission("requesting");
    setPermission(await requestSensorPermission());
  }, []);

  // Tell the dashboard why nothing is streaming when access was denied.
  useEffect(() => {
    if (permission !== "denied" || !paired) return;
    const socket = socketRef?.current;
    if (socket?.connected) {
      socket.emit("sensor_status", {
        streaming: false,
        sensors: null,
        reason: "permission_denied",
      });
    }
  }, [permission, paired, socketRef]);

  useEffect(() => {
    if (!paired || permission !== "granted") return;
    const socket = socketRef?.current;
    if (!socket) return;

    const acquisition = createSensorEngine();
    const engine = createOrientationEngine();
    let emitTimer = null;
    let displayTimer = null;
    let active = true;
    let lastEmittedQuat = null;
    let lastEmittedMeta = "";
    let lastEmitAt = 0;

    const emitStatus = (payload) => {
      if (socket.connected) socket.emit("sensor_status", payload);
    };

    const maybeEmit = () => {
      const now = Date.now();
      const model = engine.snapshot(now);
      if (!model) return;

      const meta = `${model.confidence}|${model.calibration.status}|${model.calibration.source}`;
      const moved =
        !lastEmittedQuat ||
        quatAngleDeg(model.quaternion, lastEmittedQuat) >= EMIT_MIN_ANGLE_DEG;
      const metaChanged = meta !== lastEmittedMeta;
      const keepalive = now - lastEmitAt >= KEEPALIVE_MS;
      if (!moved && !metaChanged && !keepalive) return;

      seqRef.current += 1;
      lastEmittedQuat = model.quaternion;
      lastEmittedMeta = meta;
      lastEmitAt = now;
      // Volatile: dropping a stale pose beats queueing it — the next
      // snapshot is 50ms away and supersedes it anyway.
      socket.volatile.emit("orientation_update", {
        v: PACKET_VERSION,
        seq: seqRef.current,
        t: now,
        ...model,
      });
    };

    const startLoop = () => {
      if (emitTimer || !active) return;

      acquisition.start({
        onAvailability: (available) => {
          if (!active) return;
          setSensors({
            orientation: available.orientation ? "available" : "unavailable",
            motion: available.motion ? "available" : "unavailable",
          });
          emitStatus({ streaming: true, sensors: available, reason: "probed" });
        },
        onOrientation: (sample) =>
          engine.ingestOrientation({
            ...sample,
            screenAngle: readScreenAngle(),
            at: Date.now(),
          }),
        onMotion: (sample) => engine.ingestRotationRate(sample.rot),
      });

      emitTimer = setInterval(maybeEmit, EMIT_INTERVAL_MS);
      displayTimer = setInterval(() => {
        const model = engine.snapshot(Date.now());
        const next = model
          ? {
              heading: Math.round(model.heading),
              pitch: Math.round(model.pitch),
              roll: Math.round(model.roll),
              confidence: model.confidence,
              calibration: model.calibration.status,
            }
          : null;
        // Keep the previous object when nothing visible changed so a
        // resting phone doesn't re-render 4×/second.
        setDisplay((prev) => {
          if (prev === next) return prev;
          if (
            prev &&
            next &&
            prev.heading === next.heading &&
            prev.pitch === next.pitch &&
            prev.roll === next.roll &&
            prev.confidence === next.confidence &&
            prev.calibration === next.calibration
          ) {
            return prev;
          }
          return next;
        });
      }, DISPLAY_COMMIT_MS);

      setStreaming(true);
      emitStatus({ streaming: true, sensors: null, reason: "started" });
    };

    const stopLoop = (reason) => {
      if (emitTimer) {
        clearInterval(emitTimer);
        emitTimer = null;
      }
      if (displayTimer) {
        clearInterval(displayTimer);
        displayTimer = null;
      }
      acquisition.stop();
      engine.reset();
      lastEmittedQuat = null;
      setStreaming(false);
      setDisplay(null);
      emitStatus({ streaming: false, sensors: null, reason });
    };

    // Phone sleep / tab switch: stop acquisition entirely; resume on wake.
    const handleVisibility = () => {
      if (document.hidden) {
        stopLoop("background");
        setPaused(true);
      } else {
        setPaused(false);
        startLoop();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    if (document.hidden) {
      setPaused(true);
    } else {
      startLoop();
    }

    return () => {
      active = false;
      document.removeEventListener("visibilitychange", handleVisibility);
      stopLoop("stopped");
      setPaused(false);
    };
  }, [paired, permission, socketRef]);

  return {
    permission,
    streaming,
    paused,
    sensors,
    display,
    targetHz: TARGET_HZ,
    enableSensors,
  };
}
