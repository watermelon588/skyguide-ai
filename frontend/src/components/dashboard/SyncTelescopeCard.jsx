import { motion, AnimatePresence } from "framer-motion";
import { FiSmartphone, FiAlertTriangle } from "react-icons/fi";
import { usePairing } from "../../context/PairingContext";
import Button from "../ui/Button";
import ConnectionIndicator from "../alignment/ConnectionIndicator";
import ConnectedDeviceCard from "./ConnectedDeviceCard";
import QRCodeModal from "./QRCodeModal";
import {
  DASHBOARD_CARD_SHELL,
  DASHBOARD_CARD_ROW,
  CardIdentity,
} from "./DashboardCard";

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
    <div className={DASHBOARD_CARD_ROW}>
      <CardIdentity
        className="flex-1"
        icon={<FiSmartphone className="text-lg text-orange-400" />}
        title="Pairing In Progress"
        subtitle={
          <ConnectionIndicator tone={indicator.tone} label={indicator.label} />
        }
      />
      <div className="ml-auto flex shrink-0 gap-2">
        <Button variant="secondary" size="sm" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" onClick={onViewQr} disabled={busy}>
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
      <div className={DASHBOARD_CARD_ROW}>
        <CardIdentity
          className="flex-1"
          icon={<FiSmartphone className="text-lg text-orange-400" />}
          title="Sync Telescope"
          subtitle="Connect your mobile device to begin telescope alignment."
        />
        <Button
          variant="primary"
          size="sm"
          onClick={onSync}
          className="ml-auto shrink-0"
        >
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
            className={DASHBOARD_CARD_SHELL}
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
