/**
 * Weather presentation helpers — the single source of truth for how observing
 * quality maps to colour, and how raw metric values become display strings.
 *
 * Colours stay within the established palette language: green (#22C55E) and
 * orange (#FF8C1A / red for danger) already used across the dashboard, plus
 * Tailwind's emerald / sky / amber tokens for the intermediate bands. Every
 * badge uses the same glass recipe as ObserverCard: soft tint + faint border.
 */

const UNKNOWN_STYLE = {
  text: "text-[#AAB4C5]",
  bg: "bg-white/5",
  border: "border-white/10",
  dot: "bg-[#6B7280]",
};

/** quality label -> Tailwind classes for badge / dot / accents. */
const QUALITY_STYLES = {
  Excellent: {
    text: "text-emerald-300",
    bg: "bg-emerald-500/15",
    border: "border-emerald-400/30",
    dot: "bg-emerald-400",
  },
  "Very Good": {
    text: "text-[#22C55E]",
    bg: "bg-[#22C55E]/15",
    border: "border-[#22C55E]/30",
    dot: "bg-[#22C55E]",
  },
  Good: {
    text: "text-sky-300",
    bg: "bg-sky-500/15",
    border: "border-sky-400/30",
    dot: "bg-sky-400",
  },
  Fair: {
    text: "text-amber-300",
    bg: "bg-amber-500/15",
    border: "border-amber-400/30",
    dot: "bg-amber-400",
  },
  Poor: {
    text: "text-orange-300",
    bg: "bg-orange-500/15",
    border: "border-orange-400/30",
    dot: "bg-orange-400",
  },
  Unusable: {
    text: "text-red-300",
    bg: "bg-red-500/15",
    border: "border-red-400/30",
    dot: "bg-red-400",
  },
};

/**
 * Resolve the colour set for a quality label, falling back to a neutral style
 * for unknown / missing values.
 * @param {string|null|undefined} quality
 */
export function qualityStyle(quality) {
  return QUALITY_STYLES[quality] ?? UNKNOWN_STYLE;
}

/**
 * Format a numeric metric with a unit, or an em dash when the value is missing.
 * @param {number|null|undefined} value
 * @param {string} unit  e.g. "°C", "%", " km/h"
 * @param {number} [digits=0] decimal places
 */
export function formatMetric(value, unit, digits = 0) {
  if (value == null || Number.isNaN(value)) return "—";
  const rounded = digits > 0 ? value.toFixed(digits) : Math.round(value);
  return `${rounded}${unit}`;
}
