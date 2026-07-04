import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import {
  FiX,
  FiSmartphone,
  FiClock,
  FiRefreshCw,
  FiCheckCircle,
} from "react-icons/fi";
import CountdownTimer from "./CountdownTimer";
import ConnectionIndicator from "../alignment/ConnectionIndicator";
import Button from "../ui/Button";
import { useCountdown } from "../../hooks/useCountdown";

/**
 * Builds the pairing URL encoded into the QR. Only room + token are exposed.
 */
function buildPairingUrl({ roomId, token }) {
  const params = new URLSearchParams({ room: roomId, token });
  return `${window.location.origin}/align?${params.toString()}`;
}

/**
 * Pairing session panel: QR, room id, live countdown, connection status, and
 * lifecycle controls.
 *
 * Priority of states: connected > expired > active. Once a phone is paired the
 * connection is authoritative — the countdown keeps ticking but only governs
 * whether NEW devices may join; the paired device stays connected and the
 * modal never auto-closes.
 *
 * @param {boolean} open
 * @param {{ roomId:string, token:string, expiresAt:string }|null} session
 * @param {boolean} loading         true while (re)generating a session
 * @param {boolean} phoneConnected  a phone has joined this room
 * @param {() => void} onCancel
 * @param {() => void} onRegenerate
 */
export default function QRCodeModal({
  open,
  session,
  loading,
  phoneConnected,
  onCancel,
  onRegenerate,
}) {
  const { minutes, seconds, totalSeconds, isExpired } = useCountdown(
    session?.expiresAt,
  );

  // Connection wins over the countdown.
  const connected = !!phoneConnected;
  const expired = !connected && !!session && isExpired;
  const urgent = !connected && (expired || (totalSeconds > 0 && totalSeconds < 60));

  const pairingUrl = session ? buildPairingUrl(session) : "";

  return (
    <AnimatePresence>
      {open && session && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
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
                        : "border-orange-400/20 bg-orange-500/15"
                    }`}
                  >
                    {connected ? (
                      <FiCheckCircle className="text-xl text-[#22C55E]" />
                    ) : (
                      <FiSmartphone className="text-xl text-orange-400" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {connected ? "Phone Connected" : "Pair Your Phone"}
                    </h2>
                    <p className="text-xs text-[#6B7280]">
                      {connected
                        ? "Ready for Alignment"
                        : "Scan to connect your device"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onCancel}
                  aria-label={connected ? "Close" : "Cancel session"}
                >
                  <FiX className="text-lg" />
                </Button>
              </div>

              {/* Body: connected panel vs QR (smoothly swapped) */}
              <AnimatePresence mode="wait">
                {connected ? (
                  <motion.div
                    key="connected"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3 }}
                    className="mt-6 flex flex-col items-center gap-3 py-4"
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
                ) : (
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
                        {(expired || loading) && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/40"
                          >
                            {loading ? (
                              <FiRefreshCw className="animate-spin text-2xl text-[#0b0e14]" />
                            ) : (
                              <span className="rounded-lg bg-[#0b0e14] px-3 py-1.5 text-xs font-semibold text-white">
                                Session Expired
                              </span>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Meta */}
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <span className="text-xs uppercase tracking-wide text-[#6B7280]">
                    Room ID
                  </span>
                  <span className="max-w-[190px] truncate font-mono text-xs text-[#AAB4C5]">
                    {session.roomId}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <span className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-[#6B7280]">
                    <FiClock className="text-sm" />
                    {connected ? "Session" : "Expires In"}
                  </span>
                  {connected ? (
                    <span className="text-sm font-semibold text-[#22C55E]">
                      Active
                    </span>
                  ) : (
                    <CountdownTimer
                      minutes={minutes}
                      seconds={seconds}
                      urgent={urgent}
                    />
                  )}
                </div>
              </div>

              {/* Connection status */}
              <div className="mt-4 flex items-center justify-center text-sm">
                {connected ? (
                  <ConnectionIndicator tone="connected" label="Phone Connected" />
                ) : expired ? (
                  <span className="text-[#6B7280]">
                    Generate a new session to continue.
                  </span>
                ) : (
                  <ConnectionIndicator tone="waiting" label="Waiting for Phone..." />
                )}
              </div>

              {/* Actions */}
              <div className="mt-6 flex gap-3">
                {connected ? (
                  <Button variant="secondary" onClick={onCancel} className="flex-1">
                    Close
                  </Button>
                ) : expired ? (
                  <Button
                    variant="primary"
                    onClick={onRegenerate}
                    loading={loading}
                    className="flex-1"
                  >
                    Generate New Session
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="secondary"
                      onClick={onCancel}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={onRegenerate}
                      loading={loading}
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
