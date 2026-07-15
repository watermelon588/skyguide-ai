import { motion } from "framer-motion";
import { FiSmartphone } from "react-icons/fi";
import { usePairing } from "../../context/PairingContext";
import Button from "../ui/Button";

/**
 * A single inline stat (label + value) for the status bar. Mirrors the
 * Observer Location card so both read as variants of one dashboard component.
 */
function Stat({ label, value }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[10px] uppercase tracking-wide text-ink-3">
        {label}
      </span>
      <span className="text-sm font-semibold text-ink">{value}</span>
    </div>
  );
}

function formatTime(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * The Sync Telescope card, morphed into a live "Telescope Connected" panel.
 *
 * Compact horizontal glassmorphism bar matching the Observer Location card's
 * layout philosophy (identity + inline stats + right-aligned actions, one row,
 * fixed height). Purely presentational — every field and both actions come
 * from usePairing(); no session/socket logic changed.
 */
export default function ConnectedDeviceCard() {
  const { pairing, openSessionModal, disconnectPairing } = usePairing();
  const { roomId, phone } = pairing;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="
        flex w-full flex-wrap items-center gap-x-6 gap-y-4
        border border-success/25 bg-surface-2 px-5 py-3 transition-colors
      "
    >
      {/* Left: identity */}
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-success/30 bg-success/15">
          <FiSmartphone className="text-lg text-success" />
        </div>
        <div className="min-w-0 leading-tight">
          <p className="text-sm font-bold text-ink">Telescope Connected</p>
          <p className="truncate text-xs text-ink-2">Ready for Alignment</p>
        </div>

        <span className="inline-flex shrink-0 items-center gap-1.5 border border-line bg-surface-3 px-2.5 py-1 text-[11px] font-medium text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          Connected
        </span>
      </div>

      {/* Middle: inline stats */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <Stat label="Device" value={phone.device || "Mobile device"} />
        <Stat
          label="Room"
          value={
            <span className="block max-w-[130px] truncate font-mono">
              {roomId}
            </span>
          }
        />
        <Stat label="Connected" value={formatTime(phone.connectedAt)} />
        <Stat
          label="Status"
          value={<span className="text-success">Session Active</span>}
        />
      </div>

      {/* Right: actions */}
      <div className="ml-auto flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={openSessionModal}>
          Open Session
        </Button>
        <Button variant="danger" size="sm" onClick={disconnectPairing}>
          Disconnect
        </Button>
      </div>
    </motion.section>
  );
}
