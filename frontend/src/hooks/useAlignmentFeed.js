import { useCallback, useEffect, useRef, useState } from "react";
import { usePairing } from "../context/PairingContext";

/**
 * Dashboard-side consumer of the backend alignment engine (Session 14).
 *
 * The gateway compares the phone's orientation stream against the chosen
 * celestial target and streams enriched alignment packets back:
 *
 *   alignment:update  volatile, ≤10Hz → committed to React at 4Hz (same
 *                     ref-buffer + interval pattern as useOrientationFeed)
 *   alignment:target  reliable — target acknowledged / changed
 *   alignment:state   reliable — state machine transitions (locked, lost…)
 *   alignment:error   reliable — engine-side failures with stable codes
 *
 * All math lives on the backend; this hook only moves messages into state
 * and lets the dashboard request a target.
 *
 * packetRef exposes the raw { update, receivedAt } buffer for consumers that
 * render outside React (the Alignment Mode canvas reads it per animation
 * frame at 60fps — packets arrive at ≤10Hz and the scene interpolates).
 */

const UI_COMMIT_MS = 250;
// The engine's lost-sweeper handles a dead phone stream; this guards the
// dashboard's own link — a silent socket must not freeze "Locked" on screen.
const STALE_MS = 2000;

export function useAlignmentFeed() {
  const { pairing, socketRef } = usePairing();
  const paired = pairing.status === "connected";

  const [target, setTargetInfo] = useState(null); // alignment:target payload
  const [alignState, setAlignState] = useState(null); // last alignment:state
  const [error, setError] = useState(null); // last alignment:error
  const [pending, setPending] = useState(false); // set_target in flight
  const [view, setView] = useState({ update: null, stale: false });

  const bufferRef = useRef({ update: null, receivedAt: null });

  useEffect(() => {
    if (!paired) {
      bufferRef.current = { update: null, receivedAt: null };
      setTargetInfo(null);
      setAlignState(null);
      setError(null);
      setPending(false);
      setView({ update: null, stale: false });
      return;
    }

    const socket = socketRef?.current;
    if (!socket) return;

    const onUpdate = (packet) => {
      if (!packet || typeof packet !== "object") return;
      bufferRef.current = { update: packet, receivedAt: Date.now() };
    };

    const onTarget = (payload) => {
      setTargetInfo(payload);
      setError(null);
      setPending(false);
      setAlignState(null);
    };

    const onState = (payload) => {
      setAlignState(payload);
      if (payload?.state === "idle") {
        setTargetInfo(null);
        bufferRef.current = { update: null, receivedAt: null };
      }
    };

    const onError = (payload) => {
      setError(payload);
      setPending(false);
    };

    socket.on("alignment:update", onUpdate);
    socket.on("alignment:target", onTarget);
    socket.on("alignment:state", onState);
    socket.on("alignment:error", onError);

    const commit = setInterval(() => {
      const { update, receivedAt } = bufferRef.current;
      const stale = !!receivedAt && Date.now() - receivedAt > STALE_MS;
      setView({ update: stale ? null : update, stale });
    }, UI_COMMIT_MS);

    return () => {
      socket.off("alignment:update", onUpdate);
      socket.off("alignment:target", onTarget);
      socket.off("alignment:state", onState);
      socket.off("alignment:error", onError);
      clearInterval(commit);
    };
  }, [paired, socketRef]);

  /** Request a target by catalog id (e.g. "M42") or { ra, dec, name }. */
  const setTarget = useCallback(
    (request) => {
      const socket = socketRef?.current;
      if (!socket?.connected) return;
      setPending(true);
      setError(null);
      socket.emit(
        "alignment:set_target",
        typeof request === "string" ? { catalogId: request } : request,
      );
    },
    [socketRef],
  );

  const clearTarget = useCallback(() => {
    const socket = socketRef?.current;
    if (!socket?.connected) return;
    socket.emit("alignment:clear_target");
  }, [socketRef]);

  return {
    paired,
    target,
    update: view.update,
    stale: view.stale,
    state: view.update?.state ?? alignState?.state ?? null,
    error,
    pending,
    setTarget,
    clearTarget,
    packetRef: bufferRef,
  };
}
