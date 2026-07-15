import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

/**
 * MagneticButton — pointer-follow "magnetic" wrapper (reactbits-style).
 *
 * The element leans toward the cursor while hovered and springs back on leave.
 * Purely presentational: it forwards children, className, onClick and any other
 * props straight through, so it can wrap any existing button/link without
 * changing behaviour. Honors prefers-reduced-motion (falls back to a static
 * element). Set `strength` for pull distance (px) and `as` for the tag.
 */
export default function MagneticButton({
  children,
  className = "",
  strength = 22,
  as = "button",
  ...props
}) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 220, damping: 18, mass: 0.4 });
  // Inner content trails slightly less than the shell for a layered feel.
  const ix = useTransform(sx, (v) => v * 0.35);
  const iy = useTransform(sy, (v) => v * 0.35);

  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const handleMove = (e) => {
    if (reduce || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const relX = e.clientX - (rect.left + rect.width / 2);
    const relY = e.clientY - (rect.top + rect.height / 2);
    x.set((relX / (rect.width / 2)) * strength);
    y.set((relY / (rect.height / 2)) * strength);
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  const MotionTag = motion[as] || motion.button;

  return (
    <MotionTag
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      style={{ x: sx, y: sy }}
      whileTap={{ scale: 0.96 }}
      className={className}
      {...props}
    >
      <motion.span
        style={{ x: ix, y: iy, display: "inline-flex", alignItems: "center", gap: "inherit" }}
      >
        {children}
      </motion.span>
    </MotionTag>
  );
}
