import { useRef } from "react";

/**
 * Glass card with a cursor-tracked radial spotlight (reactbits.dev-inspired,
 * rebuilt on our design tokens). The highlight is written to CSS variables in
 * a pointermove handler — no React re-renders while the cursor moves.
 *
 * Follows the DESIGN_SYSTEM glass contract:
 *   bg-white/5 · border-white/10 · backdrop-blur-3xl · shadow-2xl · rounded-2xl
 */
export default function SpotlightCard({ className = "", children, ...rest }) {
  const ref = useRef(null);

  const onPointerMove = (event) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
    el.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
    el.style.setProperty("--spot-opacity", "1");
  };

  const onPointerLeave = () => {
    ref.current?.style.setProperty("--spot-opacity", "0");
  };

  return (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-3xl ${className}`}
      {...rest}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: "var(--spot-opacity, 0)",
          background:
            "radial-gradient(340px circle at var(--spot-x, 50%) var(--spot-y, 50%), rgba(255,140,26,0.08), transparent 65%)",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
