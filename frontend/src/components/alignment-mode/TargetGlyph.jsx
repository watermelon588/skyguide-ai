import { glyphKind } from "./scene/draw";

/**
 * Tiny SVG glyph for a celestial object type — shared by the target pill,
 * the TargetSelect cards, and edge-state cards so the same object always
 * wears the same mark. Colors inherit from `currentColor`.
 */
export default function TargetGlyph({ objectType, className = "h-5 w-5" }) {
  const kind = glyphKind(objectType);

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {kind === "nebula" && (
        <>
          <circle cx="10" cy="13" r="6.5" fill="currentColor" opacity="0.25" />
          <circle cx="14" cy="10" r="5" fill="currentColor" opacity="0.4" />
          <circle cx="12" cy="12" r="1.6" fill="currentColor" />
        </>
      )}
      {kind === "galaxy" && (
        <>
          <ellipse
            cx="12" cy="12" rx="8" ry="3.4"
            transform="rotate(-28 12 12)"
            fill="currentColor" opacity="0.3"
          />
          <ellipse
            cx="12" cy="12" rx="4.5" ry="1.9"
            transform="rotate(-28 12 12)"
            fill="currentColor" opacity="0.5"
          />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        </>
      )}
      {kind === "cluster" && (
        <>
          <circle cx="12" cy="11" r="1.7" fill="currentColor" />
          <circle cx="8" cy="14.5" r="1.2" fill="currentColor" opacity="0.8" />
          <circle cx="16" cy="14" r="1.1" fill="currentColor" opacity="0.7" />
          <circle cx="10" cy="7.5" r="1" fill="currentColor" opacity="0.7" />
          <circle cx="15.5" cy="8.5" r="0.9" fill="currentColor" opacity="0.6" />
        </>
      )}
      {kind === "star" && (
        <>
          <path
            d="M12 4v16M4 12h16"
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.5"
            strokeLinecap="round"
          />
          <circle cx="12" cy="12" r="2.2" fill="currentColor" />
        </>
      )}
    </svg>
  );
}
