import { useEffect, useRef } from "react";
import gsap from "gsap";

import { useEnteredView } from "./useEnteredView";

/**
 * Number that counts up from 0 when it enters the viewport (reactbits-
 * inspired, GSAP-tweened). Visibility comes from useEnteredView so it fires
 * inside any scroll container — window on /tonight, the inner MainContent
 * scroller on the dashboard. Renders tabular figures so the layout never
 * jitters.
 */
export default function CountUp({
  value,
  decimals = 0,
  suffix = "",
  duration = 1.4,
  className = "",
}) {
  const ref = useRef(null);
  const inView = useEnteredView(ref);

  useEffect(() => {
    const el = ref.current;
    if (!inView || el == null || value == null) return undefined;
    const state = { n: 0 };
    const tween = gsap.to(state, {
      n: value,
      duration,
      ease: "power2.out",
      onUpdate: () => {
        el.textContent = `${state.n.toFixed(decimals)}${suffix}`;
      },
    });
    return () => tween.kill();
  }, [inView, value, decimals, suffix, duration]);

  // The ref span always renders — even while value is null — so the
  // IntersectionObserver attaches on mount and the tween can fire the moment
  // data arrives (a null-first render would otherwise never animate).
  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {value == null ? "—" : `0${suffix}`}
    </span>
  );
}
