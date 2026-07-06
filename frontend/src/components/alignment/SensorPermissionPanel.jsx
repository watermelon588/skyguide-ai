import { motion, AnimatePresence } from "framer-motion";
import { FiCompass, FiLock, FiSlash, FiAlertTriangle } from "react-icons/fi";
import Button from "../ui/Button";
import SensorStreamIndicator from "./SensorStreamIndicator";
import { usePairing } from "../../context/PairingContext";
import { useSensorStream } from "../../hooks/useSensorStream";

/**
 * Phone-side sensor section for /align — owns the useSensorStream lifecycle
 * and maps its permission state machine to UI:
 *
 *   needs_permission -> "Enable Motion Sensors" button (iOS gesture gate)
 *   denied           -> recovery guidance + retry
 *   unsupported / insecure_context -> terminal explanations
 *   granted          -> live streaming indicator
 *
 * Stays MOUNTED for the whole pairing session (renders nothing until the
 * phone is paired) so permission state and the stream survive reconnects —
 * the hook itself arms/disarms off pairing.status.
 */
export default function SensorPermissionPanel() {
  const { pairing } = usePairing();
  const stream = useSensorStream();

  if (pairing.status !== "connected") return null;
  if (stream.permission === "checking") return null;

  return (
    <div className="mt-6 border-t border-white/10 pt-5">
      <AnimatePresence mode="wait">
        <motion.div
          key={stream.permission}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <PanelBody stream={stream} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function PanelBody({ stream }) {
  const { permission, enableSensors } = stream;

  if (permission === "granted") {
    return (
      <SensorStreamIndicator
        streaming={stream.streaming}
        paused={stream.paused}
        sensors={stream.sensors}
        targetHz={stream.targetHz}
      />
    );
  }

  if (permission === "needs_permission" || permission === "requesting") {
    return (
      <div className="text-center">
        <FiCompass className="mx-auto text-xl text-orange-400" />
        <p className="mt-3 text-xs leading-5 text-[#AAB4C5]">
          Allow motion access to stream your phone's orientation to the
          dashboard in realtime.
        </p>
        <Button
          variant="primary"
          size="sm"
          loading={permission === "requesting"}
          onClick={enableSensors}
          className="mt-4 w-full"
        >
          Enable Motion Sensors
        </Button>
      </div>
    );
  }

  if (permission === "denied") {
    return (
      <div className="text-center">
        <FiAlertTriangle className="mx-auto text-xl text-[#EF4444]" />
        <p className="mt-3 text-xs leading-5 text-[#AAB4C5]">
          Motion access was denied. On iOS, allow it under Settings → Safari →
          Motion &amp; Orientation Access, then try again.
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={enableSensors}
          className="mt-4 w-full"
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (permission === "insecure_context") {
    return (
      <TerminalNote icon={<FiLock className="text-xl text-orange-400" />}>
        Motion sensors require a secure (HTTPS) connection. Switch the app to
        tunnel mode and rescan the QR code.
      </TerminalNote>
    );
  }

  // unsupported
  return (
    <TerminalNote icon={<FiSlash className="text-xl text-[#6B7280]" />}>
      This browser doesn't expose motion sensors. Open this link on a phone
      with a modern mobile browser.
    </TerminalNote>
  );
}

function TerminalNote({ icon, children }) {
  return (
    <div className="text-center">
      <span className="mx-auto inline-block">{icon}</span>
      <p className="mt-3 text-xs leading-5 text-[#AAB4C5]">{children}</p>
    </div>
  );
}
