import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiSmartphone, FiAlertTriangle } from "react-icons/fi";
import { createRoom } from "../../services/alignment.service";
import { usePairingSocket } from "../../hooks/usePairingSocket";
import Button from "../ui/Button";
import QRCodeModal from "./QRCodeModal";

/**
 * Dashboard card that starts a telescope pairing session.
 *
 * Owns all pairing state locally (no global context): a create-room request
 * yields { roomId, token, expiresAt }, which drives the QRCodeModal. Cancel
 * clears the session; regenerate requests a fresh one.
 */
export default function SyncTelescopeCard() {
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const [session, setSession] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const startSession = async () => {
    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await createRoom();
      // Backend shape: { success, data: { roomId, token, expiresAt } }
      setSession(res.data);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err.response?.data?.message ??
          err.message ??
          "Couldn't start a pairing session.",
      );
    }
  };

  const cancelSession = () => {
    setSession(null);
    setStatus("idle");
  };

  const isLoading = status === "loading";

  // Dashboard side of the pairing socket — active only while a session exists.
  // The room is authoritative, so this reconnects (with the new token) whenever
  // the session is regenerated and detects a phone regardless of join order.
  const { status: pairingStatus } = usePairingSocket({
    roomId: session?.roomId,
    token: session?.token,
    role: "dashboard",
    enabled: !!session,
  });
  const phoneConnected = pairingStatus === "phone_connected";

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="
          w-full rounded-2xl border border-white/10 bg-white/5 p-6
          shadow-2xl backdrop-blur-3xl transition-all
        "
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-orange-400/20 bg-orange-500/15">
            <FiSmartphone className="text-xl text-orange-400" />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-white">Sync Telescope</h3>
            <p className="mt-0.5 text-sm text-[#AAB4C5]">
              Connect your mobile device to begin telescope alignment.
            </p>
          </div>

          <Button
            variant="primary"
            onClick={startSession}
            loading={isLoading}
            className="shrink-0"
          >
            <FiSmartphone className="text-base" />
            Sync Telescope
          </Button>
        </div>

        <AnimatePresence>
          {status === "error" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 px-3 py-2 text-sm text-[#EF4444]">
                <FiAlertTriangle className="shrink-0 text-base" />
                <span className="flex-1">{errorMessage}</span>
                <button
                  onClick={startSession}
                  className="font-semibold text-white underline-offset-2 hover:underline"
                >
                  Retry
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      <QRCodeModal
        open={!!session}
        session={session}
        loading={isLoading}
        phoneConnected={phoneConnected}
        onCancel={cancelSession}
        onRegenerate={startSession}
      />
    </>
  );
}
