import { useRef } from "react";

/**
 * Flat surface card following the redesign v2 contract
 * (bg-surface-2 · border border-line · radius 0 · no glass).
 *
 * By default it carries a cursor-tracked radial spotlight in the electric-blue
 * accent (written to CSS variables in a pointermove handler — no React
 * re-renders). Pass `spotlight={false}` to drop the glow entirely for a
 * quieter card; callers then supply their own hover treatment via `className`.
 */
export default function SpotlightCard({
  className = "",
  spotlight = true,
  children,
  ...rest
}) {
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
      onPointerMove={spotlight ? onPointerMove : undefined}
      onPointerLeave={spotlight ? onPointerLeave : undefined}
      className={`relative overflow-hidden border border-line bg-surface-2 ${className}`}
      {...rest}
    >
      {spotlight && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            opacity: "var(--spot-opacity, 0)",
            background:
              "radial-gradient(340px circle at var(--spot-x, 50%) var(--spot-y, 50%), rgba(30,99,255,0.10), transparent 65%)",
          }}
        />
      )}
      <div className="relative">{children}</div>
    </div>
  );
}
