import { useEffect, useRef, useState } from "react";
import { usePairing } from "../context/PairingContext";

/**
 * Phone-side consumer of the alignment engine — the read-only sibling of the
 * dashboard's useAlignmentFeed. The gateway broadcasts alignment:* to the
 * whole pairing room (io.to), so the phone hears the same packets and can
 * render guidance on its own screen; it never sets or clears targets — that
 * stays a dashboard-role action.
 *
 * Same ref-buffer discipline as useAlignmentFeed: alignment:update lands in a
 * ref (never per-packet setState) and a low-rate interval commits to React.
 */

const UI_COMMIT_MS = 150;
// Engine's lost-sweeper fires at 2.5s of stream silence; match it so the UI
// never shows a frozen arrow as live guidance.
const STALE_MS = 2500;

export function useAlignmentGuide() {
  const { pairing, socketRef } = usePairing();
  const paired = pairing.status === "connected";

  const [target, setTarget] = useState(null); // alignment:target payload
  const [alignState, setAlignState] = useState(null); // last alignment:state
  const [view, setView] = useState({ update: null, stale: false });

  const bufferRef = useRef({ update: null, receivedAt: null });

  useEffect(() => {
    if (!paired) {
      bufferRef.current = { update: null, receivedAt: null };
      setTarget(null);
      setAlignState(null);
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
      setTarget(payload);
      setAlignState(null);
    };

    const onState = (payload) => {
      setAlignState(payload);
      if (payload?.state === "idle") {
        setTarget(null);
        bufferRef.current = { update: null, receivedAt: null };
      }
    };

    socket.on("alignment:update", onUpdate);
    socket.on("alignment:target", onTarget);
    socket.on("alignment:state", onState);

    const commit = setInterval(() => {
      const { update, receivedAt } = bufferRef.current;
      const stale = !!receivedAt && Date.now() - receivedAt > STALE_MS;
      setView({ update: stale ? null : update, stale });
    }, UI_COMMIT_MS);

    return () => {
      socket.off("alignment:update", onUpdate);
      socket.off("alignment:target", onTarget);
      socket.off("alignment:state", onState);
      clearInterval(commit);
    };
  }, [paired, socketRef]);

  return {
    target,
    update: view.update,
    stale: view.stale,
    state: view.update?.state ?? alignState?.state ?? null,
  };
}
