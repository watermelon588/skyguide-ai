import { useMemo } from "react";
import { AlignPairingProvider, usePairing } from "../context/PairingContext";
import { useOrientationStream } from "../hooks/useOrientationStream";
import { useWakeLock } from "./useWakeLock";
import StatusScreen from "./StatusScreen";
import SensorGate from "./SensorGate";
import GuideScreen from "./GuideScreen";

// A pairing token is a JWT: three base64url segments separated by dots.
const JWT_SHAPE = /^[\w-]+\.[\w-]+\.[\w-]+$/;

/**
 * SkyGuide Companion — the phone's whole app, one linear flow:
 *
 *   scan QR → connecting → enable sensors (one full-screen step) → guidance
 *
 * Screens replace each other edge-to-edge; there is no navigation. The
 * orientation stream hook stays mounted for the entire session so permission
 * state and streaming survive socket reconnects.
 */
export default function CompanionApp() {
  const { room, token, valid } = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get("room") ?? "";
    const t = params.get("token") ?? "";
    return { room: r, token: t, valid: r.trim().length > 0 && JWT_SHAPE.test(t) };
  }, []);

  if (!valid) {
    return (
      <Shell>
        <StatusScreen kind="invalid" />
      </Shell>
    );
  }

  return (
    <AlignPairingProvider roomId={room} pairingToken={token}>
      <Companion room={room} />
    </AlignPairingProvider>
  );
}

function Companion({ room }) {
  const { pairing } = usePairing();
  const stream = useOrientationStream();

  // The screen must not sleep mid-session — sleep backgrounds the page and
  // kills the sensor stream (the old flow's biggest failure mode).
  useWakeLock(pairing.status === "connected");

  let body;
  if (pairing.status !== "connected") {
    body = <StatusScreen kind={pairing.status} error={pairing.error} />;
  } else if (stream.permission === "checking") {
    body = null;
  } else if (stream.permission !== "granted") {
    body = <SensorGate stream={stream} />;
  } else {
    body = <GuideScreen stream={stream} room={room} />;
  }

  return <Shell>{body}</Shell>;
}

/** Full-height app frame: brand strip on top, screen content below. */
function Shell({ children }) {
  return (
    <div
      className="flex min-h-dvh flex-col bg-bg text-ink"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <header className="flex items-center justify-between border-b border-line px-5 py-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.35em] text-ink-2">
          SkyGuide
        </span>
        <span className="text-[10px] uppercase tracking-[0.25em] text-ink-4">
          Companion
        </span>
      </header>
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
