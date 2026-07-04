import { motion, AnimatePresence } from "framer-motion";
import { FaLocationDot } from "react-icons/fa6";
import { useEffect } from "react";
import { useLocation } from "../../hooks/useLocation";
import Button from "../ui/Button";

/**
 * First-run modal that captures the observer's location via browser GPS.
 *
 * Network + state logic lives in useLocation(); this component is UI only.
 *
 * @param {boolean}  open
 * @param {() => void} onClose  called after a successful save / dismissal
 * @param {() => void} onLater  called when the user postpones
 * @param {() => void} [onManual] Phase 2 hook — opens manual entry. When
 *                                omitted the "Enter Manually" button is a
 *                                disabled placeholder.
 */
export default function LocationPermissionModal({
  open,
  onClose,
  onLater,
  onManual,
}) {
  const { status, errorMessage, reset, detectAndSaveLocation } = useLocation();

  // Auto-close shortly after a successful save.
  useEffect(() => {
    if (status !== "success") return;
    const timer = setTimeout(() => onClose(), 1200);
    return () => clearTimeout(timer);
  }, [status, onClose]);

  const isBusy = status === "requesting";

  const primaryLabel = {
    idle: "Allow Location",
    requesting: "Fetching Location...",
    success: "Location Saved",
    denied: "Try Again",
    error: "Try Again",
  }[status];

  const handlePrimary = () => {
    if (status === "denied" || status === "error") {
      reset();
      return;
    }
    detectAndSaveLocation();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
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
              transition={{ duration: 0.35 }}
              className="
                w-full
                max-w-sm
                rounded-2xl
                border
                border-white/10
                bg-white/5
                backdrop-blur-3xl
                px-8
                py-6
                shadow-2xl
              "
            >
              {/* Icon */}
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-orange-400/20 bg-orange-500/15">
                <FaLocationDot className="text-4xl text-orange-400" />
              </div>

              {/* Heading */}
              <h2 className="mt-6 text-center text-2xl font-bold text-white">
                {status === "idle" && "Enable Location Access"}
                {status === "requesting" && "Fetching Your Location"}
                {status === "success" && "Location Saved"}
                {status === "denied" && "Permission Denied"}
                {status === "error" && "Something Went Wrong"}
              </h2>

              <p className="mt-4 text-center text-sm leading-6 text-[#AAB4C5]">
                {status === "idle" &&
                  "SkyGuide AI uses your location to recommend the best celestial targets visible tonight."}
                {status === "requesting" &&
                  "Waiting for your browser and GPS..."}
                {status === "success" &&
                  "Your observing location has been saved successfully."}
                {status === "denied" &&
                  "Location permission was denied. You can try again or enter your location manually."}
                {status === "error" && errorMessage}
              </p>

              {/* Buttons */}
              <div className="mt-8 flex flex-col gap-3">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handlePrimary}
                  disabled={isBusy}
                >
                  {primaryLabel}
                </Button>

                <Button
                  variant="secondary"
                  size="lg"
                  onClick={onManual}
                  disabled={!onManual}
                >
                  {onManual ? "Enter Manually" : "Enter Manually (Coming Soon)"}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => (status === "success" ? onClose() : onLater())}
                  className="font-medium"
                >
                  {status === "success" ? "Continue" : "Maybe Later"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
