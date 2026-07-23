import { useEffect, useRef } from "react";
import { gsap } from "gsap";

import "./BounceCards.css";

/**
 * BounceCards — overlapping cards that bounce in on mount and push their
 * siblings aside on hover.
 *
 * Ported from the Multi-Modal-Search-Engine project (React Bits original) and
 * adapted here: SkyGuide's design tokens, a rank badge for the top-ten strip,
 * and a click handler so a featured card can open its photo.
 *
 * The class is `.bounce-card`, not `.card` as in the source — `card` is a
 * shadcn/ui class name in this codebase, and a bare `.card` selector inside a
 * gsap.context would have swept up unrelated elements.
 */
export default function BounceCards({
  className = "",
  images = [],
  containerWidth = 400,
  containerHeight = 400,
  animationDelay = 0.4,
  animationStagger = 0.06,
  easeType = "elastic.out(1, 0.8)",
  transformStyles = [],
  enableHover = true,
  labels = [],
  onCardClick,
  // Rank of the first card in this instance. The top-ten strip wraps into rows
  // of five, and each row is its own BounceCards — without this the second row
  // would restart its badges at #1.
  rankOffset = 0,
  // The badges read as a leaderboard, which is the point on /gallery but is
  // clutter on the landing page's teaser row.
  showRank = true,
  pushDistance = 160,
  cardSize = 240,
}) {
  const containerRef = useRef(null);

  const prefersReducedMotion = () =>
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (prefersReducedMotion()) {
        gsap.set(".bounce-card", { scale: 1 });
        return;
      }
      gsap.fromTo(
        ".bounce-card",
        { scale: 0 },
        {
          scale: 1,
          stagger: animationStagger,
          ease: easeType,
          delay: animationDelay,
        },
      );
    }, containerRef);
    return () => ctx.revert();
  }, [animationStagger, easeType, animationDelay, images.length]);

  const getNoRotationTransform = (transformStr) => {
    const hasRotate = /rotate\([\s\S]*?\)/.test(transformStr);
    if (hasRotate) {
      return transformStr.replace(/rotate\([\s\S]*?\)/, "rotate(0deg)");
    }
    if (transformStr === "none") return "rotate(0deg)";
    return `${transformStr} rotate(0deg)`;
  };

  const getPushedTransform = (baseTransform, offsetX) => {
    const translateRegex = /translate\(([-0-9.]+)px\)/;
    const match = baseTransform.match(translateRegex);
    if (match) {
      const newX = parseFloat(match[1]) + offsetX;
      return baseTransform.replace(translateRegex, `translate(${newX}px)`);
    }
    return baseTransform === "none"
      ? `translate(${offsetX}px)`
      : `${baseTransform} translate(${offsetX}px)`;
  };

  const pushSiblings = (hoveredIdx) => {
    if (!enableHover || !containerRef.current || prefersReducedMotion()) return;

    const q = gsap.utils.selector(containerRef);

    images.forEach((_, i) => {
      const target = q(`.bounce-card-${i}`);
      gsap.killTweensOf(target);

      const baseTransform = transformStyles[i] || "none";

      if (i === hoveredIdx) {
        gsap.to(target, {
          transform: getNoRotationTransform(baseTransform),
          duration: 0.4,
          ease: "back.out(1.4)",
          overwrite: "auto",
        });
      } else {
        const offsetX = i < hoveredIdx ? -pushDistance : pushDistance;
        gsap.to(target, {
          transform: getPushedTransform(baseTransform, offsetX),
          duration: 0.4,
          ease: "back.out(1.4)",
          delay: Math.abs(hoveredIdx - i) * 0.05,
          overwrite: "auto",
        });
      }
    });
  };

  const resetSiblings = () => {
    if (!enableHover || !containerRef.current || prefersReducedMotion()) return;

    const q = gsap.utils.selector(containerRef);

    images.forEach((_, i) => {
      const target = q(`.bounce-card-${i}`);
      gsap.killTweensOf(target);
      gsap.to(target, {
        transform: transformStyles[i] || "none",
        duration: 0.4,
        ease: "back.out(1.4)",
        overwrite: "auto",
      });
    });
  };

  return (
    <div
      className={`bounceCardsContainer ${className}`}
      ref={containerRef}
      style={{
        position: "relative",
        width: containerWidth,
        height: containerHeight,
        "--bounce-card-size": `${cardSize}px`,
      }}
    >
      {images.map((src, idx) => (
        <div
          key={src ?? idx}
          className={`bounce-card bounce-card-${idx}`}
          style={{ transform: transformStyles[idx] ?? "none" }}
          onMouseEnter={() => pushSiblings(idx)}
          onMouseLeave={resetSiblings}
          onClick={() => onCardClick?.(idx)}
          role={onCardClick ? "button" : undefined}
          tabIndex={onCardClick ? 0 : undefined}
          onKeyDown={(e) => {
            if (onCardClick && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              onCardClick(idx);
            }
          }}
        >
          <img
            className="bounce-image"
            src={src}
            alt={labels[idx] ?? `Featured photo ${idx + 1}`}
            loading="lazy"
          />
          {showRank && (
            <span className="bounce-rank">#{rankOffset + idx + 1}</span>
          )}
        </div>
      ))}
    </div>
  );
}
