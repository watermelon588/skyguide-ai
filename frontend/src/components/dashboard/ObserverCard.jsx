import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaLocationDot } from "react-icons/fa6";
import {
  FiEdit3,
  FiRefreshCw,
  FiCloud,
  FiAlertTriangle,
  FiCheck,
} from "react-icons/fi";
import { useLocation } from "../../hooks/useLocation";
import { getObserverLocation, formatPlaceName } from "../../utils/location";
import Button from "../ui/Button";

const SPRING = { type: "spring", stiffness: 400, damping: 32 };

/**
 * A single inline stat (label + value) for the status bar.
 */
function Stat({ label, value }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[10px] uppercase tracking-wide text-[#6B7280]">
        {label}
      </span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}

/**
 * Presentation config for the Refresh GPS slot, per hook status.
 */
function refreshStateConfig(status, errorMessage) {
  switch (status) {
    case "requesting":
      return {
        icon: <FiRefreshCw className="animate-spin text-base" />,
        label: "Refreshing GPS...",
        tone: "border-white/10 bg-white/5 text-white",
      };
    case "success":
      return {
        icon: <FiCheck className="text-base" />,
        label: "Location Updated",
        tone: "border-[#22C55E]/30 bg-[#22C55E]/15 text-[#22C55E]",
      };
    case "denied":
      return {
        icon: <FiAlertTriangle className="text-base" />,
        label: "GPS Permission Required",
        tone: "border-orange-400/30 bg-orange-500/15 text-orange-300",
      };
    case "error":
      return {
        icon: <FiAlertTriangle className="text-base" />,
        label: errorMessage || "GPS Update Failed",
        tone: "border-orange-400/30 bg-orange-500/15 text-orange-300",
      };
    default:
      return {
        icon: <FiRefreshCw className="text-base" />,
        label: "Refresh GPS",
        tone: "border-white/10 bg-white/5 text-white hover:bg-white/10",
      };
  }
}

/**
 * Dashboard Observer status bar.
 *
 * Compact, horizontal, glassmorphic, fixed-height. Always prioritises the
 * location saved in AuthContext and keeps the Active badge visible. GPS
 * feedback (refreshing / updated / permission) surfaces inline inside the
 * Refresh GPS action, whose width springs open — the card never grows
 * vertically and never adds a second row.
 *
 * @param {() => void} [onEdit] opens manual entry. Button disabled when omitted.
 */
export default function ObserverCard({ onEdit }) {
  const { user, status, errorMessage, reset, detectAndSaveLocation } =
    useLocation();
  const { latitude, longitude, timezone, elevation_m, city, state, country } =
    getObserverLocation(user);

  const placeName = formatPlaceName({ city, state, country });

  // Auto-return the Refresh action to its idle label after showing feedback.
  useEffect(() => {
    if (status !== "success" && status !== "denied" && status !== "error") {
      return;
    }
    const ms = status === "success" ? 1800 : 3500;
    const timer = setTimeout(() => reset(), ms);
    return () => clearTimeout(timer);
  }, [status, reset]);

  const lat = latitude != null ? `${latitude.toFixed(4)}°` : "—";
  const lng = longitude != null ? `${longitude.toFixed(4)}°` : "—";
  const coordKey = `${lat},${lng},${timezone},${elevation_m}`;

  const refresh = refreshStateConfig(status, errorMessage);
  // Idle is a normal button; feedback states are transient and non-interactive.
  const refreshDisabled = status === "requesting" || status === "success";

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="
        flex w-full flex-wrap items-center gap-x-6 gap-y-4
        rounded-2xl border border-white/10 bg-white/5 px-5 py-3
        shadow-2xl backdrop-blur-3xl transition-all
      "
    >
      {/* Left: identity */}
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-400/20 bg-orange-500/15">
          <FaLocationDot className="text-lg text-orange-400" />
        </div>
        <div className="min-w-0 leading-tight">
          <p className="text-sm font-bold text-white">Observer Location</p>
          <p className="truncate text-xs text-[#AAB4C5]">
            {placeName ?? "Location name unavailable"}
          </p>
        </div>

        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-[#22C55E]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
          Active
        </span>
      </div>

      {/* Middle: inline stats (animate on change for a smooth success cue) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={coordKey}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25 }}
          className="flex flex-wrap items-center gap-x-6 gap-y-2"
        >
          <Stat label="Lat" value={lat} />
          <Stat label="Lng" value={lng} />
          <Stat label="Timezone" value={timezone ?? "—"} />
          <Stat
            label="Elevation"
            value={elevation_m != null ? `${elevation_m} m` : "—"}
          />
        </motion.div>
      </AnimatePresence>

      {/* Weather placeholder — Phase 17. Sits inline, adds no height. */}
      <div className="flex items-center gap-1.5 rounded-lg border border-dashed border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] text-[#6B7280]">
        <FiCloud className="text-sm" />
        Weather soon
      </div>

      {/* Right: actions. The Refresh slot expands horizontally (width only) to
          reveal state inline; height stays constant, no wrapping inside. */}
      <div className="ml-auto flex items-center gap-2">
        <Button variant="primary" size="sm" onClick={onEdit} disabled={!onEdit}>
          <FiEdit3 className="text-base" />
          <span className="hidden sm:inline">Edit</span>
        </Button>

        <motion.button
          layout
          transition={SPRING}
          onClick={detectAndSaveLocation}
          disabled={refreshDisabled}
          className={`inline-flex items-center gap-2 overflow-hidden rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${refresh.tone}`}
        >
          <motion.span layout="position" className="shrink-0">
            {refresh.icon}
          </motion.span>
          <motion.span
            key={status}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="hidden whitespace-nowrap sm:inline"
          >
            {refresh.label}
          </motion.span>
        </motion.button>
      </div>
    </motion.section>
  );
}
