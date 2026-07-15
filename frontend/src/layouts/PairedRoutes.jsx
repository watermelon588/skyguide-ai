import { useEffect, useRef } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { PairingProvider, usePairing } from "../context/PairingContext";

/**
 * Layout route that owns the telescope pairing session for the whole
 * authenticated app.
 *
 * PairingProvider used to be mounted inside the Dashboard page, which pinned
 * Alignment Mode to an overlay: navigating anywhere unmounted the provider and
 * dropped the phone. Mounting it here — above /dashboard, /alignment, /tonight,
 * /profile and /community — means one socket survives navigation between them,
 * which is what lets /alignment exist as a real route.
 *
 * Cost when nobody is paired is zero: the provider opens no socket until a
 * session actually has a roomId + token.
 *
 * Deliberately NOT wrapping /align (the phone companion) — that page mounts its
 * own AlignPairingProvider for the phone side of the same room.
 */
export default function PairedRoutes() {
  return (
    <PairingProvider>
      <PairingHandoff />
      <Outlet />
    </PairingProvider>
  );
}

/** Only the dashboard hands off — a reconnect elsewhere shouldn't yank the user. */
const HANDOFF_FROM = "/dashboard";

/**
 * Let the "Connected" beat land before moving. The QR modal auto-dismisses at
 * 900ms (SUCCESS_DISMISS_MS in PairingContext); leaving just after that means
 * the user sees pairing succeed on the dashboard, then arrives at the
 * workspace — rather than the screen changing out from under the scan.
 */
const HANDOFF_DELAY_MS = 1100;

/**
 * Sends the observer to the alignment workspace the moment their phone pairs.
 *
 * Fires on the TRANSITION into "connected" only, so re-entering /dashboard
 * while already paired doesn't bounce the user back out. Any pending guided
 * target (/dashboard?observe=M42) rides along as ?target=, which is what lets
 * "Start observing" reach guidance without anyone typing a catalog id.
 */
function PairingHandoff() {
  const { pairing } = usePairing();
  const navigate = useNavigate();
  const location = useLocation();

  const wasConnected = useRef(pairing.status === "connected");

  useEffect(() => {
    const connected = pairing.status === "connected";
    const justConnected = connected && !wasConnected.current;
    wasConnected.current = connected;

    if (!justConnected) return;
    if (location.pathname !== HANDOFF_FROM) return;

    const observe = new URLSearchParams(location.search).get("observe");
    const to = observe
      ? `/alignment?target=${encodeURIComponent(observe)}`
      : "/alignment";

    const timer = setTimeout(() => navigate(to, { replace: true }), HANDOFF_DELAY_MS);
    return () => clearTimeout(timer);
  }, [pairing.status, location.pathname, location.search, navigate]);

  return null;
}
