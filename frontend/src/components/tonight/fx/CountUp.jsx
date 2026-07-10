import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

/**
 * Number that counts up from 0 when it scrolls into view (reactbits-inspired,
 * GSAP-powered). Renders tabular figures so the layout never jitters.
 */
export default function CountUp({
  value,
  decimals = 0,
  suffix = "",
  duration = 1.4,
  className = "",
}) {
  const ref = useRef(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (el == null || value == null) return;
      const state = { n: 0 };
      gsap.to(state, {
        n: value,
        duration,
        ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 90%", once: true },
        onUpdate: () => {
          el.textContent = `${state.n.toFixed(decimals)}${suffix}`;
        },
      });
    },
    { dependencies: [value], scope: ref },
  );

  if (value == null) {
    return <span className={className}>—</span>;
  }

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {`0${suffix}`}
    </span>
  );
}
