import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger, prefersReducedMotion } from "./gsap";

/**
 * SplitReveal — headline reveal that splits text into words and rises each out
 * of an overflow mask as it scrolls into view (GSAP ScrollTrigger).
 *
 * Presentational only. Renders `as` (default h2) containing the split words.
 * `text` is the string to animate; keep markup simple so screen readers get the
 * full phrase via aria-label. Collapses to a plain fade under reduced motion.
 */
export default function SplitReveal({
  text,
  as: Tag = "h2",
  className = "",
  wordClassName = "",
  stagger = 0.08,
  start = "top 85%",
}) {
  const ref = useRef(null);
  const words = String(text).split(" ");

  useGSAP(
    () => {
      const targets = ref.current?.querySelectorAll("[data-word]");
      if (!targets?.length) return;

      if (prefersReducedMotion()) {
        gsap.from(targets, {
          opacity: 0,
          duration: 0.4,
          stagger: 0.03,
          scrollTrigger: { trigger: ref.current, start },
        });
        return;
      }

      gsap.from(targets, {
        yPercent: 120,
        opacity: 0,
        duration: 0.9,
        ease: "expo.out",
        stagger,
        scrollTrigger: { trigger: ref.current, start },
      });
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} aria-label={text} className={className}>
      {words.map((word, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="inline-block overflow-hidden align-bottom"
        >
          <span data-word className={`inline-block ${wordClassName}`}>
            {word}
            {i < words.length - 1 ? " " : ""}
          </span>
        </span>
      ))}
    </Tag>
  );
}
