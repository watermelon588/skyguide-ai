import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "./gsap";

/**
 * ScrollMarquee — a horizontal text strip whose motion is driven by the page's
 * VERTICAL scroll. It drifts slowly on its own, but scrolling down pushes the
 * text one way and scrolling up reverses it.
 *
 * Self-contained rAF loop (no ScrollTrigger): each frame it reads the change in
 * window.scrollY and adds it to the horizontal offset, so vertical scroll maps
 * directly to horizontal travel and reverses naturally. The row is repeated
 * `copies` times and the offset wraps across one copy's width for a seamless
 * infinite loop. Reduced motion → a static row.
 *
 * Props: items (string[]), baseSpeed (px/s idle drift), direction (1 | -1),
 * scrollFactor (how strongly scroll pushes it), separator, copies, className.
 */
export default function ScrollMarquee({
  items = [],
  baseSpeed = 40,
  direction = 1,
  scrollFactor = 1.4,
  separator = "✦",
  copies = 6,
  className = "",
}) {
  const ref = useRef(null);

  useEffect(() => {
    const track = ref.current?.querySelector("[data-track]");
    const copy = ref.current?.querySelector("[data-copy]");
    if (!track || !copy || prefersReducedMotion()) return undefined;

    let raf = 0;
    let x = 0;
    let lastY = window.scrollY;
    let last = performance.now();

    const loop = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const y = window.scrollY;
      const scrollDelta = y - lastY; // px scrolled this frame (signed)
      lastY = y;

      // idle drift + scroll push. Scroll push is NOT multiplied by `direction`,
      // so both rows react the same way to scroll (down → →, up → ←) while
      // drifting in opposite directions when idle.
      x += baseSpeed * direction * dt + scrollDelta * scrollFactor;

      const w = copy.offsetWidth || 1;
      const wrapped = (((x % w) + w) % w) - w; // seamless, in [-w, 0)
      track.style.transform = `translate3d(${wrapped}px, 0, 0)`;

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else {
        last = performance.now();
        lastY = window.scrollY;
        raf = requestAnimationFrame(loop);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [baseSpeed, direction, scrollFactor]);

  return (
    <div
      ref={ref}
      className={`relative flex w-full overflow-hidden ${className}`}
      role="marquee"
    >
      <div data-track className="flex will-change-transform">
        {Array.from({ length: copies }, (_, i) => (
          <div
            key={i}
            data-copy={i === 0 ? "" : undefined}
            className="flex shrink-0 items-center gap-10 pr-10"
          >
            {items.map((item, j) => (
              <span
                key={j}
                className="flex items-center gap-10 whitespace-nowrap"
              >
                <span>{item}</span>
                <span className="text-accent" aria-hidden="true">
                  {separator}
                </span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
