import { useCallback, useEffect, useRef, useState } from "react";
import { usePairing } from "../context/PairingContext";
import {
  createSensorEngine,
  getSensorCapability,
  requestSensorPermission,
} from "../services/sensor.service";

/**
 * Phone-side sensor streaming lifecycle (mounted on /align).
 *
 * Bridges the acquisition engine (sensor.service) to the pairing socket:
 * listeners write at native rate into the engine's latest-sample store, and
 * a fixed 20Hz loop snapshots + emits `sensor_frame` — so emit rate is
 * decoupled from whatever rate the device fires events at.
 *
 * Nothing per-frame touches React state: seq lives in a ref and the packet
 * goes straight to the socket. Only rare transitions (permission, pause,
 * sensor availability) re-render.
 *
 * The stream self-heals: it is keyed off pairing.status, so a socket
 * reconnect (disconnected -> authenticating -> connected) tears the loop
 * down and re-arms it on the fresh connection automatically.
 */

const TARGET_HZ = 20; // matches WEBSOCKET_PROTOCOL.md; never exceed 60 without profiling
const EMIT_INTERVAL_MS = Math.round(1000 / TARGET_HZ);
const PACKET_VERSION = 1;

const INITIAL_SENSORS = { orientation: "pending", motion: "pending" };

export function useSensorStream() {
  const { pairing, socketRef } = usePairing();
  const paired = pairing.status === "connected";

  // "checking" | "insecure_context" | "unsupported" | "needs_permission"
  // | "requesting" | "granted" | "denied"
  const [permission, setPermission] = useState("checking");
  const [streaming, setStreaming] = useState(false);
  const [paused, setPaused] = useState(false);
  const [sensors, setSensors] = useState(INITIAL_SENSORS);

  const seqRef = useRef(0);

  useEffect(() => {
    const capability = getSensorCapability();
    // "auto" (Android/desktop): no prompt exists — treat as granted and let
    // the first-event probe expose silently blocked sensors.
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

    const engine = createSensorEngine();
    let interval = null;
    let active = true;

    const emitStatus = (payload) => {
      if (socket.connected) socket.emit("sensor_status", payload);
    };

    const startLoop = () => {
      if (interval || !active) return;

      engine.start({
        onAvailability: (available) => {
          if (!active) return;
          setSensors({
            orientation: available.orientation ? "available" : "unavailable",
            motion: available.motion ? "available" : "unavailable",
          });
          emitStatus({ streaming: true, sensors: available, reason: "probed" });
        },
      });

      interval = setInterval(() => {
        const snap = engine.snapshot();
        // Nothing has fired yet — an all-null frame carries no information.
        if (!snap.orientation && !snap.motion) return;
        seqRef.current += 1;
        // Volatile: on a congested link, dropping this frame beats queueing
        // it behind stale ones — the next snapshot is 50ms away.
        socket.volatile.emit("sensor_frame", {
          v: PACKET_VERSION,
          seq: seqRef.current,
          t: Date.now(),
          orientation: snap.orientation,
          motion: snap.motion,
          screen: snap.screen,
        });
      }, EMIT_INTERVAL_MS);

      setStreaming(true);
      emitStatus({ streaming: true, sensors: null, reason: "started" });
    };

    const stopLoop = (reason) => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
      engine.stop();
      setStreaming(false);
      emitStatus({ streaming: false, sensors: null, reason });
    };

    // Phone sleep / tab switch: stop acquisition entirely (battery, and
    // browsers throttle hidden timers anyway); resume on wake.
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
    targetHz: TARGET_HZ,
    enableSensors,
  };
}
