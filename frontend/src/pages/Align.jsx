import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { FiAlertTriangle } from "react-icons/fi";
import { AlignPairingProvider, usePairing } from "../context/PairingContext";
import PairingStatus from "../components/alignment/PairingStatus";
import SensorPermissionPanel from "../components/alignment/SensorPermissionPanel";
import Button from "../components/ui/Button";

// A pairing token is a JWT: three base64url segments separated by dots.
const JWT_SHAPE = /^[\w-]+\.[\w-]+\.[\w-]+$/;

/**
 * Mobile Telescope Companion — pairing + sensor streaming page.
 *
 * Reads room + token from the QR, validates their format, opens the pairing
 * socket (Connecting → Authenticating → Connected), then hands off to
 * SensorPermissionPanel which turns the phone into a realtime orientation
 * sensor streaming to the paired dashboard. No alignment math here — that is
 * the future Orientation Engine's job.
 */
export default function Align() {
  const [params] = useSearchParams();

  const room = params.get("room") ?? "";
  const token = params.get("token") ?? "";

  const validFormat = useMemo(
    () => room.trim().length > 0 && JWT_SHAPE.test(token),
    [room, token],
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-6 text-ink">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-sm border border-line bg-surface-2 px-7 py-8"
      >
        {validFormat ? (
          <AlignPairingProvider roomId={room} pairingToken={token}>
            <AlignPairingView room={room} />
          </AlignPairingProvider>
        ) : (
          <InvalidSessionView />
        )}
      </motion.div>
    </div>
  );
}

/** Consumes PairingContext directly — no socket state lives on this page. */
function AlignPairingView({ room }) {
  const { pairing } = usePairing();
  const navigate = useNavigate();

  const terminated = pairing.status === "terminated";

  return (
    <>
      <PairingStatus status={pairing.status} error={pairing.error} />

      {pairing.status === "connected" && (
        <div className="mt-6 border border-line bg-surface-3 px-3 py-2 text-center">
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-3">
            Room
          </p>
          <p className="mt-0.5 truncate font-mono text-xs text-ink-2">
            {room}
          </p>
        </div>
      )}

      {terminated ? (
        <Button
          variant="primary"
          onClick={() => navigate("/")}
          className="mt-6 w-full"
        >
          Return to Home
        </Button>
      ) : (
        // Mounted for the whole session (not just while "connected") so
        // sensor permission state survives reconnects; it renders nothing
        // until the phone is paired.
        <SensorPermissionPanel />
      )}
    </>
  );
}

function InvalidSessionView() {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center border border-danger/30 bg-danger/10">
        <FiAlertTriangle className="text-2xl text-danger" />
      </div>
      <h1 className="mt-6 text-xl font-bold uppercase tracking-tight text-ink">
        Invalid Session
      </h1>
      <p className="mt-4 text-sm leading-6 text-ink-2">
        This link is missing a valid room or token. Please rescan the QR code
        from your SkyGuide dashboard.
      </p>
    </div>
  );
}
