import { motion, AnimatePresence } from "framer-motion";
import { FiSmartphone, FiAlertTriangle } from "react-icons/fi";
import { usePairing } from "../../context/PairingContext";
import Button from "../ui/Button";
import ConnectionIndicator from "../alignment/ConnectionIndicator";
import ConnectedDeviceCard from "./ConnectedDeviceCard";
import QRCodeModal from "./QRCodeModal";

const PENDING_INDICATOR = {
  creating: { tone: "connecting", label: "Starting session..." },
  waiting: { tone: "waiting", label: "Waiting for phone" },
  expired: { tone: "error", label: "Session Expired" },
};

/**
 * Pre-connection card: a session exists (creating / waiting / expired) but no
 * phone has paired yet. Non-blocking — the QR lives in the modal, and this
 * card offers a way back to it plus a cancel.
 */
function PairingPendingCard({ status, onViewQr, onCancel }) {
  const indicator = PENDING_INDICATOR[status] ?? PENDING_INDICATOR.waiting;
  const busy = status === "creating";

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-orange-400/20 bg-orange-500/15">
        <FiSmartphone className="text-xl text-orange-400" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-base font-bold text-white">Pairing In Progress</h3>
        <ConnectionIndicator tone={indicator.tone} label={indicator.label} />
      </div>
      <div className="flex shrink-0 gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onViewQr} disabled={busy}>
          View QR
        </Button>
      </div>
    </div>
  );
}

/** Idle / creation-failed card: the entry point to start pairing. */
function SyncPromptCard({ error, onSync }) {
  return (
    <>
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
        <Button variant="primary" onClick={onSync} className="shrink-0">
          <FiSmartphone className="text-base" />
          Sync Telescope
        </Button>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 px-3 py-2 text-sm text-[#EF4444]">
              <FiAlertTriangle className="shrink-0 text-base" />
              <span className="flex-1">{error}</span>
              <button
                onClick={onSync}
                className="font-semibold text-white underline-offset-2 hover:underline"
              >
                Retry
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * Telescope pairing dashboard slot.
 *
 * Purely presentational orchestrator: reads usePairing() and morphs between
 * three card states based on pairing.status. The QR modal is rendered here but
 * its visibility is owned by PairingContext (modalOpen), so once a phone pairs
 * the modal auto-closes and this card becomes the persistent Connected card —
 * the dashboard is never blocked.
 */
export default function SyncTelescopeCard() {
  const {
    pairing,
    createPairingSession,
    disconnectPairing,
    openSessionModal,
  } = usePairing();
  const { status, roomId, error } = pairing;

  const hasSession = !!roomId;
  // "error" with a room means a mid-session socket failure (modal owns it);
  // "error" without a room means creation failed (show the prompt + banner).
  const isPending =
    status === "creating" ||
    status === "waiting" ||
    status === "expired" ||
    (status === "error" && hasSession);

  const cardKind = status === "connected" ? "connected" : isPending ? "pending" : "sync";

  return (
    <>
      <AnimatePresence mode="wait">
        {cardKind === "connected" ? (
          <ConnectedDeviceCard key="connected" />
        ) : (
          <motion.section
            key={cardKind}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="
              w-full rounded-2xl border border-white/10 bg-white/5 p-6
              shadow-2xl backdrop-blur-3xl transition-all
            "
          >
            {cardKind === "pending" ? (
              <PairingPendingCard
                status={status}
                onViewQr={openSessionModal}
                onCancel={disconnectPairing}
              />
            ) : (
              <SyncPromptCard
                error={status === "error" && !hasSession ? error : ""}
                onSync={createPairingSession}
              />
            )}
          </motion.section>
        )}
      </AnimatePresence>

      <QRCodeModal />
    </>
  );
}
