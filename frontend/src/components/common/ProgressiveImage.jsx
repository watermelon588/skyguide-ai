import { useState } from "react";

/**
 * Blur-up image: shows a small, already-fast placeholder (the catalog thumbnail)
 * blurred and scaled while the full-resolution `src` downloads, then crossfades
 * to it on load. Matters because a few hero images are heavy — the M31 hero is
 * an 11 MB Wikimedia PNG — and a blank grey box for a second reads as broken.
 *
 * Fills its positioned parent (absolute inset-0), so the caller controls size
 * and aspect via that container, exactly like a plain <img className="...cover">.
 */
export default function ProgressiveImage({ src, placeholder, alt, className = "" }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <span className="absolute inset-0 overflow-hidden">
      {/* Placeholder: instant, blurred, slightly scaled to hide blur edges. */}
      {placeholder && (
        <img
          src={placeholder}
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 h-full w-full scale-105 object-cover blur-lg transition-opacity duration-500 ${
            loaded ? "opacity-0" : "opacity-100"
          }`}
        />
      )}

      {/* Full image: fades in once decoded. */}
      <img
        src={src}
        alt={alt}
        decoding="async"
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
          loaded ? "opacity-100" : "opacity-0"
        } ${className}`}
      />
    </span>
  );
}
