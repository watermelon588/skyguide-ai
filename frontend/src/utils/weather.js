/**
 * Weather presentation helpers — the single source of truth for how observing
 * quality maps to colour, and how raw metric values become display strings.
 *
 * A sequential data-viz scale for observing quality: emerald → green → sky →
 * amber → deep-amber → red. Deliberately avoids the brand blue (reserved for
 * interactive accent) and the retired orange. Every badge is a flat tint +
 * hairline border, matching the redesigned surfaces.
 */

const UNKNOWN_STYLE = {
  text: "text-ink-2",
  bg: "bg-surface-2",
  border: "border-line",
  dot: "bg-ink-4",
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
    text: "text-success",
    bg: "bg-success/15",
    border: "border-success/30",
    dot: "bg-success",
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
    text: "text-amber-400",
    bg: "bg-amber-500/20",
    border: "border-amber-500/40",
    dot: "bg-amber-500",
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
