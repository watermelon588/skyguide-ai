import { useEffect, useRef, useState } from "react";
import { usePairing } from "../context/PairingContext";

/**
 * Dashboard-side consumer of the phone's normalized orientation stream
 * (supersedes Session 12's raw useSensorFeed).
 *
 * `orientation_update` packets arrive at up to 20Hz (less when the phone is
 * at rest — the phone dedups unchanged poses down to a ~2Hz keepalive).
 * Every packet lands in a ref-backed stats object; a 250ms interval commits
 * a snapshot to state, so the panel renders at 4Hz regardless of stream rate.
 *
 * Listeners attach to the existing pairing socket keyed off pairing.status —
 * teardown/reconnect detaches/reattaches them automatically.
 */

const UI_COMMIT_MS = 250;
const RATE_WINDOW_MS = 2000;
// Keepalive is 500ms, so >2s without a packet means the stream is dead —
// the model must then be treated as gone, never shown as current.
const STALE_MS = 2000;

const INITIAL_VIEW = {
  model: null, // last orientation_update packet, verbatim
  status: null, // last sensor_status payload from the phone
  rate: 0, // measured packets/sec (motion-dependent by design)
  totalPackets: 0,
  dropped: 0,
  lastSeq: null,
  ageMs: null,
  stale: false,
};

function createStats() {
  return {
    model: null,
    status: null,
    arrivals: [],
    totalPackets: 0,
    dropped: 0,
    lastSeq: null,
    lastArrival: null,
  };
}

export function useOrientationFeed() {
  const { pairing, socketRef } = usePairing();
  const paired = pairing.status === "connected";

  const [view, setView] = useState(INITIAL_VIEW);
  const statsRef = useRef(createStats());

  useEffect(() => {
    if (!paired) {
      statsRef.current = createStats();
      setView(INITIAL_VIEW);
      return;
    }

    const socket = socketRef?.current;
    if (!socket) return;

    const stats = statsRef.current;

    const onUpdate = (packet) => {
      if (!packet || typeof packet !== "object") return;
      const now = Date.now();
      if (stats.lastSeq != null && packet.seq > stats.lastSeq + 1) {
        stats.dropped += packet.seq - stats.lastSeq - 1;
      }
      stats.lastSeq = packet.seq ?? stats.lastSeq;
      stats.model = packet;
      stats.lastArrival = now;
      stats.totalPackets += 1;
      stats.arrivals.push(now);
    };

    const onStatus = (status) => {
      // Merge so a sensors:null lifecycle ping doesn't wipe probe results.
      stats.status = { ...stats.status, ...status };
    };

    socket.on("orientation_update", onUpdate);
    socket.on("sensor_status", onStatus);

    const commit = setInterval(() => {
      const now = Date.now();
      while (stats.arrivals.length && now - stats.arrivals[0] > RATE_WINDOW_MS) {
        stats.arrivals.shift();
      }
      const stale =
        !!stats.lastArrival && now - stats.lastArrival > STALE_MS;
      setView({
        // A stale model is withheld, not displayed — frozen orientation
        // masquerading as live data is the one failure mode this layer
        // must never have.
        model: stale ? null : stats.model,
        status: stats.status,
        rate:
          Math.round((stats.arrivals.length / (RATE_WINDOW_MS / 1000)) * 10) /
          10,
        totalPackets: stats.totalPackets,
        dropped: stats.dropped,
        lastSeq: stats.lastSeq,
        ageMs: stats.lastArrival ? now - stats.lastArrival : null,
        stale,
      });
    }, UI_COMMIT_MS);

    return () => {
      socket.off("orientation_update", onUpdate);
      socket.off("sensor_status", onStatus);
      clearInterval(commit);
    };
  }, [paired, socketRef]);

  return { paired, ...view };
}
