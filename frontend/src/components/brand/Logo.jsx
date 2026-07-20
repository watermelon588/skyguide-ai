import {
  BRAND_ACCENT_WORD,
  BRAND_FULL_NAME,
  BRAND_NAME,
  LOGO_SRC,
} from "../../config/brand";

/**
 * The SkyGuide lockup — the ONLY place the logo is composed.
 *
 * Every surface renders this instead of its own copy of the wordmark, so the
 * mark, its proportions and the accent split stay identical app-wide and a
 * change lands in one edit (see config/brand.js).
 *
 * Deliberately dependency-free (no framer-motion, no router): the phone
 * companion's lightweight bundle renders it too, and must not pull the app's
 * libraries in through the logo.
 *
 * @param {"full"|"mark"} [variant]  mark + wordmark, or just the mark
 * @param {"sm"|"md"|"lg"|"xl"} [size]
 * @param {string} [className]       layout classes for the wrapper
 * @param {boolean} [decorative]     true when an adjacent label already names
 *                                   the brand — hides it from screen readers
 */

const SIZES = {
  sm: { mark: "h-6 w-6", text: "text-sm" },
  md: { mark: "h-8 w-8", text: "text-lg" },
  lg: { mark: "h-9 w-9", text: "text-xl sm:text-2xl" },
  xl: { mark: "h-11 w-11", text: "text-2xl" },
};

export default function Logo({
  variant = "full",
  size = "md",
  className = "",
  decorative = false,
}) {
  const s = SIZES[size] ?? SIZES.md;

  return (
    <span
      className={`inline-flex items-center gap-2.5 ${className}`}
      aria-hidden={decorative || undefined}
    >
      <img
        src={LOGO_SRC}
        alt={variant === "mark" && !decorative ? BRAND_FULL_NAME : ""}
        width={44}
        height={44}
        className={`${s.mark} shrink-0 select-none object-contain`}
        draggable="false"
      />
      {variant === "full" && (
        <span
          className={`font-black uppercase leading-none tracking-tight text-ink ${s.text}`}
        >
          {BRAND_NAME} <span className="text-accent">{BRAND_ACCENT_WORD}</span>
        </span>
      )}
    </span>
  );
}
