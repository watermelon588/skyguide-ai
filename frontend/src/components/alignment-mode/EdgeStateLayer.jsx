import { motion, AnimatePresence } from "framer-motion";
import {
  FiAlertTriangle,
  FiMoon,
  FiWifiOff,
  FiSmartphone,
  FiMapPin,
} from "react-icons/fi";
import Button from "../ui/Button";
import { EDGE_COPY } from "./copy";

/**
 * The single glass card for every edge state — the scene never blanks, it
 * dims behind this. One card at a time (AlignmentMode resolves priority);
 * each states the situation in a sentence plus at most one primary action.
 *
 * Red is reserved for the permission-denied glyph only, per the palette
 * discipline — everything else stays calm.
 */

const ICONS = {
  permission_denied: { icon: FiAlertTriangle, tone: "text-[#EF4444]", ring: "border-[#EF4444]/30 bg-[#EF4444]/10" },
  no_observer: { icon: FiMapPin, tone: "text-orange-400", ring: "border-orange-400/20 bg-orange-500/15" },
  pairing_lost: { icon: FiSmartphone, tone: "text-orange-400", ring: "border-orange-400/20 bg-orange-500/15" },
  stream_background: { icon: FiMoon, tone: "text-[#AAB4C5]", ring: "border-white/10 bg-white/5" },
  stream_lost: { icon: FiWifiOff, tone: "text-orange-400", ring: "border-orange-400/20 bg-orange-500/15" },
  below_horizon: { icon: FiMoon, tone: "text-[#AAB4C5]", ring: "border-white/10 bg-white/5" },
};

export default function EdgeStateLayer({ edge, targetName, onPrimary, onSecondary }) {
  const copy = edge ? EDGE_COPY[edge] : null;
  const visual = edge ? ICONS[edge] : null;

  return (
    <AnimatePresence>
      {copy && (
        <motion.div
          key={edge}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.3 }}
          className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center px-6"
          style={{ paddingBottom: "max(6rem, env(safe-area-inset-bottom, 0px))" }}
        >
          <div
            role="alertdialog"
            aria-label={copy.title}
            className="pointer-events-auto w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 px-6 py-5 shadow-2xl backdrop-blur-3xl"
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${visual.ring}`}
              >
                <visual.icon className={`text-lg ${visual.tone}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white">{copy.title}</p>
                <p className="mt-1 text-xs leading-5 text-[#AAB4C5]">
                  {typeof copy.body === "function"
                    ? copy.body(targetName ?? "This target")
                    : copy.body}
                </p>
              </div>
            </div>

            {(copy.primary || copy.secondary) && (
              <div className="mt-4 flex gap-2.5">
                {copy.secondary && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={onSecondary}
                    className="flex-1"
                  >
                    {copy.secondary}
                  </Button>
                )}
                {copy.primary && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={onPrimary}
                    className="flex-1"
                  >
                    {copy.primary}
                  </Button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
