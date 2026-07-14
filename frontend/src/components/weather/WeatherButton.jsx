import { motion } from "framer-motion";
import { FiCloud, FiChevronDown, FiLoader } from "react-icons/fi";
import { formatMetric, qualityStyle } from "../../utils/weather";

const SPRING = { type: "spring", stiffness: 400, damping: 30 };

/**
 * Compact weather capsule for the Observer card — a *controlled* trigger.
 *
 * It owns no data or open-state of its own: the parent card lifts both so the
 * weather panel can expand inline as an accordion (not a floating popover).
 * Stays ≤180px; once weather has loaded it surfaces the current temperature +
 * overall rating, and the chevron rotates 180° while expanded.
 *
 * @param {{
 *   open: boolean,
 *   onToggle: () => void,
 *   weather?: object,
 *   quality?: string,
 *   loading?: boolean,
 *   disabled?: boolean,
 * }} props
 */
export default function WeatherButton({
  open,
  onToggle,
  weather,
  quality,
  loading = false,
  disabled = false,
}) {
  const qualityText = quality ? qualityStyle(quality).text : "";

  return (
    <motion.button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      title={disabled ? "Save your observer location first." : undefined}
      whileHover={disabled ? undefined : { scale: 1.03 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      aria-expanded={open}
      className="flex max-w-[180px] items-center gap-2 border border-line bg-surface-2 px-3 py-1.5 text-left transition-colors hover:bg-surface-3 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center text-accent">
        {loading ? (
          <FiLoader className="animate-spin text-sm" />
        ) : (
          <FiCloud className="text-base" />
        )}
      </span>

      {weather ? (
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="text-sm font-semibold tabular-nums text-ink">
            {formatMetric(weather.temperature_c, "°C")}
          </span>
          <span className={`truncate text-[10px] font-medium ${qualityText}`}>
            {quality}
          </span>
        </span>
      ) : (
        <span className="text-sm font-medium text-ink">Weather</span>
      )}

      <motion.span
        animate={{ rotate: open ? 180 : 0 }}
        transition={SPRING}
        className="ml-auto text-ink-3"
      >
        <FiChevronDown className="text-sm" />
      </motion.span>
    </motion.button>
  );
}
