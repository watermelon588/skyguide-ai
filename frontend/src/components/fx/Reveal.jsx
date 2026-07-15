import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger, prefersReducedMotion } from "./gsap";

/**
 * Reveal — scroll-in wrapper. Fades + rises its children when they enter the
 * viewport (GSAP ScrollTrigger). The redesign's default entrance for sections,
 * bento tiles and copy blocks.
 *
 * Props: as (tag/component), y (rise px), delay, duration, start, once,
 * plus className passthrough. Reduced motion → opacity-only fade.
 */
export default function Reveal({
  children,
  as: Tag = "div",
  className = "",
  y = 40,
  delay = 0,
  duration = 0.9,
  start = "top 88%",
  once = true,
  ...props
}) {
  const ref = useRef(null);

  useGSAP(
    () => {
      if (!ref.current) return;
      const reduce = prefersReducedMotion();
      gsap.from(ref.current, {
        y: reduce ? 0 : y,
        opacity: 0,
        duration: reduce ? 0.4 : duration,
        delay,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ref.current,
          start,
          toggleActions: once ? "play none none none" : "play none none reverse",
        },
      });
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} className={className} {...props}>
      {children}
    </Tag>
  );
}
