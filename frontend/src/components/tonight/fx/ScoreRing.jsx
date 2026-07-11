import { useEffect, useRef } from "react";
import gsap from "gsap";

import { scoreColor } from "../vocabulary";
import { useEnteredView } from "./useEnteredView";

/**
 * Circular 0–100 visibility-score gauge. The arc draws itself when the ring
 * enters the viewport — useEnteredView, not ScrollTrigger, so it works in
 * nested scroll containers like the dashboard. Color follows the shared
 * score->tone mapping so orange stays meaningful.
 */
export default function ScoreRing({ score, size = 56, strokeWidth = 4 }) {
  const arcRef = useRef(null);
  const inView = useEnteredView(arcRef);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = score == null ? 0 : Math.min(score, 100) / 100;

  useEffect(() => {
    const arc = arcRef.current;
    if (!inView || !arc) return undefined;
    const tween = gsap.fromTo(
      arc,
      { strokeDashoffset: circumference },
      {
        strokeDashoffset: circumference * (1 - fraction),
        duration: 1.2,
        ease: "power3.out",
      },
    );
    return () => tween.kill();
  }, [inView, fraction, circumference]);

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
      <span
        className="absolute inset-0 flex items-center justify-center font-semibold tabular-nums text-white"
        style={{ fontSize: Math.max(11, size * 0.25) }}
      >
        {score ?? "—"}
      </span>
    </div>
  );
}
