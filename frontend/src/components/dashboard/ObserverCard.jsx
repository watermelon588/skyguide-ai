import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaLocationDot } from "react-icons/fa6";
import {
  FiEdit3,
  FiRefreshCw,
  FiAlertTriangle,
  FiCheck,
} from "react-icons/fi";
import { useLocation } from "../../hooks/useLocation";
import { useWeather } from "../../hooks/useWeather";
import { getObserverLocation, formatPlaceName } from "../../utils/location";
import Button from "../ui/Button";
import WeatherButton from "../weather/WeatherButton";
import WeatherPopover from "../weather/WeatherPopover";
import { DASHBOARD_CARD_ROW, CardIdentity } from "./DashboardCard";

const SPRING = { type: "spring", stiffness: 400, damping: 32 };

/**
 * A single inline stat (label + value) for the status bar.
 */
function Stat({ label, value }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[10px] uppercase tracking-wide text-ink-3">
        {label}
      </span>
      <span className="text-sm font-semibold tabular-nums text-ink">{value}</span>
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
        tone: "border-line bg-surface-3 text-ink",
      };
    case "success":
      return {
        icon: <FiCheck className="text-base" />,
        label: "Location Updated",
        tone: "border-success/30 bg-success/15 text-success",
      };
    case "denied":
      return {
        icon: <FiAlertTriangle className="text-base" />,
        label: "GPS Permission Required",
        tone: "border-warning/30 bg-warning/15 text-warning",
      };
    case "error":
      return {
        icon: <FiAlertTriangle className="text-base" />,
        label: errorMessage || "GPS Update Failed",
        tone: "border-danger/30 bg-danger/15 text-danger",
      };
    default:
      return {
        icon: <FiRefreshCw className="text-base" />,
        label: "Refresh GPS",
        tone: "border-line bg-surface-2 text-ink hover:bg-surface-3",
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

  // --- Weather accordion state (lifted so the panel can expand inline) ---
  const [weatherOpen, setWeatherOpen] = useState(false);
  // Latches on first open so the query stays enabled (cached) afterwards.
  const [weatherActivated, setWeatherActivated] = useState(false);
  const hasCoords =
    typeof latitude === "number" && typeof longitude === "number";

  const {
    data: weatherData,
    isLoading: weatherLoading,
    isError: weatherError,
    isFetching: weatherFetching,
    refetch: refetchWeather,
  } = useWeather({ latitude, longitude, enabled: weatherActivated });

  const toggleWeather = () => {
    if (!hasCoords) return;
    if (!weatherActivated) setWeatherActivated(true);
    setWeatherOpen((prev) => !prev);
  };

  // Escape collapses the panel.
  useEffect(() => {
    if (!weatherOpen) return;
    const onKey = (e) => e.key === "Escape" && setWeatherOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [weatherOpen]);

  const weather = weatherData?.weather;
  const weatherQuality = weatherData?.observing_conditions?.observing_quality;
  // Spinner in the capsule only during the very first fetch (no cached data).
  const weatherLoadingFirst = weatherFetching && !weatherData;

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
        flex w-full flex-col overflow-hidden
        border border-line bg-surface-2 transition-colors
      "
    >
      {/* Summary row — the collapsed Observer bar (unchanged height). */}
      <div className={`${DASHBOARD_CARD_ROW} px-5 py-3`}>
      {/* Left: identity */}
      <CardIdentity
        icon={<FaLocationDot className="text-lg text-accent" />}
        title="Observer Location"
        subtitle={placeName ?? "Location name unavailable"}
        trailing={
          <span className="inline-flex shrink-0 items-center gap-1.5 border border-line bg-surface-3 px-2.5 py-1 text-[11px] font-medium text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Active
          </span>
        }
      />

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

      {/* Live weather — controlled capsule; expands the accordion below. */}
      <WeatherButton
        open={weatherOpen}
        onToggle={toggleWeather}
        weather={weather}
        quality={weatherQuality}
        loading={weatherLoadingFirst}
        disabled={!hasCoords}
      />

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
      </div>
      {/* End summary row */}

      {/* Weather accordion — expands inline (height + opacity), full card width.
          Normal flow, so the Sync Telescope card is simply pushed down. */}
      <AnimatePresence initial={false}>
        {weatherOpen && (
          <motion.div
            key="weather-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.25 }}
            className="w-full overflow-hidden"
          >
            <div className="border-t border-line bg-surface-1 px-5 py-4">
              <WeatherPopover
                data={weatherData}
                isLoading={weatherLoading}
                isError={weatherError}
                onRetry={refetchWeather}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
