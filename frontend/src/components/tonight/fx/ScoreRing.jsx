import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import { scoreColor } from "../vocabulary";

gsap.registerPlugin(ScrollTrigger);

/**
 * Circular 0–100 visibility-score gauge. The arc draws itself (GSAP
 * stroke-dashoffset) when scrolled into view; color follows the shared
 * score->tone mapping so orange stays meaningful.
 */
export default function ScoreRing({ score, size = 56, strokeWidth = 4 }) {
  const arcRef = useRef(null);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = score == null ? 0 : Math.min(score, 100) / 100;

  useGSAP(
    () => {
      const arc = arcRef.current;
      if (!arc) return;
      gsap.fromTo(
        arc,
        { strokeDashoffset: circumference },
        {
          strokeDashoffset: circumference * (1 - fraction),
          duration: 1.2,
          ease: "power3.out",
          scrollTrigger: { trigger: arc, start: "top 92%", once: true },
        },
      );
    },
    { dependencies: [fraction, circumference] },
  );

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Visibility score ${score ?? "unknown"} out of 100`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />
        <circle
          ref={arcRef}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={scoreColor(score)}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums text-white">
        {score ?? "—"}
      </span>
    </div>
  );
}
