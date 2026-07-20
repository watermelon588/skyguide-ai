import { useMemo, useState } from "react";
import { AlignPairingProvider, usePairing } from "../context/PairingContext";
import { useOrientationStream } from "../hooks/useOrientationStream";
import { useWakeLock } from "./useWakeLock";
import { useInstallPrompt } from "./useInstallPrompt";
import Logo from "../components/brand/Logo";
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
        <Logo size="sm" />
        <span className="text-[10px] uppercase tracking-[0.25em] text-ink-4">
          Companion
        </span>
      </header>
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      <InstallBanner />
    </div>
  );
}

/**
 * "Keep it on your home screen" — the app-without-an-app-store affordance.
 * Chromium gets a real install button (replaying beforeinstallprompt); iOS
 * gets the Share-menu instruction. Hidden once installed / already standalone,
 * and dismissible for the session.
 */
function InstallBanner() {
  const { canPrompt, install, installed, standalone, isIOS } =
    useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);

  if (standalone || installed || dismissed) return null;
  if (!canPrompt && !isIOS) return null;

  return (
    <div className="flex items-center gap-3 border-t border-line bg-surface-1 px-4 py-3">
      <p className="min-w-0 flex-1 text-xs leading-5 text-ink-2">
        {canPrompt
          ? "Get the companion as an app — full screen, on your home screen."
          : "Install: tap Share, then “Add to Home Screen”."}
      </p>
      {canPrompt && (
        <button
          type="button"
          onClick={install}
          className="shrink-0 bg-accent px-4 py-2 text-xs font-bold uppercase tracking-wide text-ink transition-colors hover:bg-accent-hi"
        >
          Install app
        </button>
      )}
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="shrink-0 px-1 text-ink-4 transition-colors hover:text-ink-2"
      >
        ✕
      </button>
    </div>
  );
}
