import { motion } from "framer-motion";

/**
 * Marquee — infinite horizontal scrolling-text strip (reactbits-style).
 *
 * Renders two identical tracks and translates the pair by -50% on loop, so the
 * seam is invisible. Pure CSS-transform animation (GPU-friendly), pauses on
 * hover, and collapses to a static row under prefers-reduced-motion.
 *
 * Props: items (string[]), speed (seconds per loop), direction ("left"|"right"),
 * separator (node between items), className passthrough on the wrapper.
 */
export default function Marquee({
  items = [],
  speed = 24,
  direction = "left",
  separator = "✦", // ✦
  className = "",
}) {
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const track = (
    <div className="flex shrink-0 items-center gap-10 pr-10">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-10 whitespace-nowrap">
          <span>{item}</span>
          <span className="text-accent" aria-hidden="true">
            {separator}
          </span>
        </span>
      ))}
    </div>
  );

  return (
    <div
      className={`group relative flex w-full overflow-hidden ${className}`}
      role="marquee"
    >
      <motion.div
        className="flex"
        animate={reduce ? undefined : { x: direction === "left" ? "-50%" : "0%" }}
        initial={reduce ? undefined : { x: direction === "left" ? "0%" : "-50%" }}
        transition={{ duration: speed, ease: "linear", repeat: Infinity }}
        style={{ willChange: "transform" }}
      >
        {track}
        {track}
      </motion.div>
    </div>
  );
}
