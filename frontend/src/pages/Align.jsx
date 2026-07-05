import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { FiAlertTriangle } from "react-icons/fi";
import { AlignPairingProvider, usePairing } from "../context/PairingContext";
import PairingStatus from "../components/alignment/PairingStatus";
import Button from "../components/ui/Button";

// A pairing token is a JWT: three base64url segments separated by dots.
const JWT_SHAPE = /^[\w-]+\.[\w-]+\.[\w-]+$/;

/**
 * Mobile Telescope Companion — pairing page.
 *
 * Phase 1 scope: read room + token, validate their format, then open the
 * pairing socket (Connecting → Authenticating → Connected). No sensors,
 * orientation, or alignment yet — those are Session 5.
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
    <div className="flex min-h-screen items-center justify-center bg-[#090B12] px-6 text-white">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 px-7 py-8 shadow-2xl backdrop-blur-3xl"
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
        <div className="mt-6 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center">
          <p className="text-[10px] uppercase tracking-wide text-[#6B7280]">
            Room
          </p>
          <p className="mt-0.5 truncate font-mono text-xs text-[#AAB4C5]">
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
        <p className="mt-6 text-center text-xs text-[#4B5563]">
          Realtime orientation streaming coming soon.
        </p>
      )}
    </>
  );
}

function InvalidSessionView() {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#EF4444]/30 bg-[#EF4444]/10">
        <FiAlertTriangle className="text-2xl text-[#EF4444]" />
      </div>
      <h1 className="mt-6 text-xl font-bold">Invalid Session</h1>
      <p className="mt-4 text-sm leading-6 text-[#AAB4C5]">
        This link is missing a valid room or token. Please rescan the QR code
        from your SkyGuide dashboard.
      </p>
    </div>
  );
}
