import { motion, AnimatePresence } from "framer-motion";
import {
  FiSmartphone,
  FiCheckCircle,
  FiAlertTriangle,
  FiRefreshCw,
} from "react-icons/fi";
import ConnectionIndicator from "./ConnectionIndicator";

/**
 * Phone-side pairing status view.
 *
 * Maps the usePairingSocket status machine to a friendly, animated state:
 * Connecting → Authenticating → Connected, plus failure / reconnecting states.
 *
 * @param {string} status  from usePairingSocket
 * @param {string} [error] message for the error state
 */
export default function PairingStatus({ status, error }) {
  const view = STATUS_VIEW[status] ?? STATUS_VIEW.connecting;

  return (
    <div className="text-center">
      <div
        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full border ${view.ring}`}
      >
        <span className={view.iconSpin ? "animate-spin" : ""}>{view.icon}</span>
      </div>

      <h1 className="mt-6 text-xl font-bold text-white">{view.title}</h1>

      <div className="mt-3 flex justify-center">
        <ConnectionIndicator tone={view.tone} label={view.indicator} />
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={status}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="mt-5 text-sm leading-6 text-[#AAB4C5]"
        >
          {status === "error" && error ? error : view.subtitle}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

const STATUS_VIEW = {
  connecting: {
    icon: <FiRefreshCw className="text-2xl text-orange-400" />,
    iconSpin: true,
    ring: "border-orange-400/20 bg-orange-500/15",
    title: "Connecting",
    tone: "connecting",
    indicator: "Reaching mission control...",
    subtitle: "Establishing a secure connection to your dashboard.",
  },
  authenticating: {
    icon: <FiRefreshCw className="text-2xl text-orange-400" />,
    iconSpin: true,
    ring: "border-orange-400/20 bg-orange-500/15",
    title: "Authenticating",
    tone: "connecting",
    indicator: "Verifying pairing session...",
    subtitle: "Confirming your pairing token with the server.",
  },
  connected: {
    icon: <FiCheckCircle className="text-2xl text-[#22C55E]" />,
    iconSpin: false,
    ring: "border-[#22C55E]/30 bg-[#22C55E]/15",
    title: "Connected",
    tone: "connected",
    indicator: "Paired with dashboard",
    subtitle: "Your device is paired and ready for alignment.",
  },
  disconnected: {
    icon: <FiRefreshCw className="text-2xl text-orange-400" />,
    iconSpin: true,
    ring: "border-orange-400/20 bg-orange-500/15",
    title: "Reconnecting",
    tone: "connecting",
    indicator: "Connection lost",
    subtitle: "Trying to restore the connection to your dashboard.",
  },
  error: {
    icon: <FiAlertTriangle className="text-2xl text-[#EF4444]" />,
    iconSpin: false,
    ring: "border-[#EF4444]/30 bg-[#EF4444]/10",
    title: "Session Expired",
    tone: "error",
    indicator: "Pairing failed",
    subtitle:
      "This pairing session is invalid or has expired. Please rescan the QR code from your dashboard.",
  },
  idle: {
    icon: <FiSmartphone className="text-2xl text-orange-400" />,
    iconSpin: false,
    ring: "border-orange-400/20 bg-orange-500/15",
    title: "Preparing",
    tone: "idle",
    indicator: "Starting...",
    subtitle: "Getting things ready.",
  },
};
