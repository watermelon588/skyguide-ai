import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import {
  FiX,
  FiSmartphone,
  FiClock,
  FiRefreshCw,
  FiCheckCircle,
  FiAlertTriangle,
} from "react-icons/fi";
import { usePairing } from "../../context/PairingContext";
import { getQrBaseUrl } from "../../config/network";
import CountdownTimer from "./CountdownTimer";
import ConnectionIndicator from "../alignment/ConnectionIndicator";
import Button from "../ui/Button";

/**
 * Builds the pairing URL encoded into the QR. Only room + token are exposed.
 * The base URL comes from the network config so the QR points at the LAN IP
 * or Cloudflare tunnel (never localhost) depending on NETWORK_MODE.
 */
function buildPairingUrl({ roomId, pairingToken }) {
  const params = new URLSearchParams({ room: roomId, token: pairingToken });
  return `${getQrBaseUrl()}/align?${params.toString()}`;
}

function formatTime(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Small label/value row shared by the connected info panel. */
function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
      <span className="text-xs uppercase tracking-wide text-[#6B7280]">
        {label}
      </span>
      <span className="max-w-[190px] truncate text-sm font-medium text-white">
        {value}
      </span>
    </div>
  );
}

/**
 * Pairing modal.
 *
 * Visibility is owned by PairingContext (modalOpen) — this component never
 * controls the session, only displays it. Two content modes:
 *
 *  - Pairing:   QR + countdown + "Waiting for Phone" (status not connected).
 *  - Connected: read-only info panel (Room, Connected Since, Session Active)
 *               with Disconnect + Close — NO QR. This is the same panel that
 *               plays the success beat right before the modal auto-closes.
 *
 * Close (X / backdrop / Close button) only hides the modal; the session keeps
 * running. Only Disconnect ends it.
 */
export default function QRCodeModal() {
  const {
    pairing,
    createPairingSession,
    disconnectPairing,
    closeSessionModal,
  } = usePairing();
  const { status, roomId, pairingToken, phone, remaining, error, modalOpen } =
    pairing;

  const connected = status === "connected";
  const expired = status === "expired";
  const creating = status === "creating";
  const midSessionError = status === "error" && !!roomId;

  const pairingUrl =
    roomId && pairingToken ? buildPairingUrl({ roomId, pairingToken }) : "";

  return (
    <AnimatePresence>
      {modalOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSessionModal}
          />

          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 px-7 py-6 shadow-2xl backdrop-blur-3xl"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
                      connected
                        ? "border-[#22C55E]/30 bg-[#22C55E]/15"
                        : midSessionError
                          ? "border-[#EF4444]/30 bg-[#EF4444]/10"
                          : "border-orange-400/20 bg-orange-500/15"
                    }`}
                  >
                    {connected ? (
                      <FiCheckCircle className="text-xl text-[#22C55E]" />
                    ) : midSessionError ? (
                      <FiAlertTriangle className="text-xl text-[#EF4444]" />
                    ) : (
                      <FiSmartphone className="text-xl text-orange-400" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {connected
                        ? "Telescope Connected"
                        : midSessionError
                          ? "Pairing Error"
                          : "Pair Your Phone"}
                    </h2>
                    <p className="text-xs text-[#6B7280]">
                      {connected
                        ? "Session active"
                        : midSessionError
                          ? error
                          : "Scan to connect your device"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeSessionModal}
                  aria-label="Close"
                >
                  <FiX className="text-lg" />
                </Button>
              </div>

              {/* Body */}
              <AnimatePresence mode="wait">
                {connected ? (
                  <motion.div
                    key="connected"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3 }}
                    className="mt-6 flex flex-col items-center gap-3"
                  >
                    <motion.div
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="flex h-20 w-20 items-center justify-center rounded-full border border-[#22C55E]/30 bg-[#22C55E]/15"
                    >
                      <FiCheckCircle className="text-4xl text-[#22C55E]" />
                    </motion.div>
                    <h3 className="text-lg font-bold text-white">
                      Device Connected
                    </h3>
                    <p className="text-sm text-[#AAB4C5]">Ready to Align</p>
                  </motion.div>
                ) : creating ? (
                  <motion.div
                    key="creating"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="mt-6 flex flex-col items-center gap-3 py-8"
                  >
                    <FiRefreshCw className="animate-spin text-3xl text-orange-400" />
                    <p className="text-sm text-[#AAB4C5]">Creating session...</p>
                  </motion.div>
                ) : !midSessionError ? (
                  <motion.div
                    key="qr"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-6 flex justify-center"
                  >
                    <div className="relative rounded-2xl bg-white p-4 shadow-lg">
                      <QRCodeSVG
                        value={pairingUrl}
                        size={196}
                        level="M"
                        marginSize={0}
                        fgColor="#0b0e14"
                        bgColor="#ffffff"
                        className={
                          expired
                            ? "opacity-20 blur-[2px] transition"
                            : "transition"
                        }
                      />
                      <AnimatePresence>
                        {expired && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/40"
                          >
                            <span className="rounded-lg bg-[#0b0e14] px-3 py-1.5 text-xs font-semibold text-white">
                              Session Expired
                            </span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {/* Meta */}
              <div className="mt-6 space-y-3">
                <InfoRow label="Room ID" value={<span className="font-mono">{roomId ?? "—"}</span>} />

                {connected ? (
                  <InfoRow
                    label="Connected"
                    value={formatTime(phone.connectedAt)}
                  />
                ) : (
                  <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                    <span className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-[#6B7280]">
                      <FiClock className="text-sm" />
                      Expires In
                    </span>
                    <CountdownTimer
                      minutes={remaining.minutes}
                      seconds={remaining.seconds}
                      urgent={remaining.urgent}
                    />
                  </div>
                )}
              </div>

              {/* Connection status */}
              <div className="mt-4 flex items-center justify-center text-sm">
                {connected ? (
                  <ConnectionIndicator tone="connected" label="Phone Connected" />
                ) : expired ? (
                  <span className="text-[#6B7280]">
                    Generate a new session to continue.
                  </span>
                ) : midSessionError ? null : creating ? null : (
                  <ConnectionIndicator tone="waiting" label="Waiting for Phone..." />
                )}
              </div>

              {/* Actions */}
              <div className="mt-6 flex gap-3">
                {connected ? (
                  <>
                    <Button
                      variant="secondary"
                      onClick={closeSessionModal}
                      className="flex-1"
                    >
                      Close
                    </Button>
                    <Button
                      variant="danger"
                      onClick={disconnectPairing}
                      className="flex-1"
                    >
                      Disconnect
                    </Button>
                  </>
                ) : expired ? (
                  <Button
                    variant="primary"
                    onClick={createPairingSession}
                    className="flex-1"
                  >
                    Generate New Session
                  </Button>
                ) : midSessionError ? (
                  <>
                    <Button
                      variant="secondary"
                      onClick={disconnectPairing}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={createPairingSession}
                      className="flex-1"
                    >
                      Try Again
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="secondary"
                      onClick={disconnectPairing}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={createPairingSession}
                      disabled={creating}
                      className="flex-1"
                    >
                      Generate New QR
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
