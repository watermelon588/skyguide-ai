import { useEffect, useRef, useState } from "react";

/**
 * Scale a fixed-width fan of cards down to whatever width its container has.
 *
 * The BounceCards fan is laid out at an intrinsic pixel width, so on a narrow
 * screen it would overflow. This measures the wrapper and returns the factor to
 * scale by, never above 1 (cards are never blown up past their natural size).
 *
 * Shared by the gallery page's featured strip and the landing page's teaser so
 * the two stay in step.
 *
 * @param {number} naturalWidth intrinsic width of one row, in px
 * @returns {[React.RefObject, number]} ref for the wrapper, and the scale
 */
export function useFitScale(naturalWidth) {
  const ref = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const fit = () => {
      const available = element.clientWidth;
      // Ignore zero/unmeasured widths: the element may not be laid out yet, and
      // ResizeObserver never fires while the page is hidden. Scaling to 0 there
      // would leave the strip permanently invisible.
      if (!available) return;
      setScale(Math.min(1, available / naturalWidth));
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    window.addEventListener("resize", fit);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [naturalWidth]);

  return [ref, scale];
}

/** Fan cards out symmetrically around the centre, whatever the count. */
export function buildTransforms(count, { spread, maxTilt }) {
  if (count === 0) return [];
  const middle = (count - 1) / 2;
  return Array.from({ length: count }, (_, i) => {
    const offset = i - middle;
    const x = Math.round(offset * spread);
    // Alternate the tilt so neighbours lean opposite ways.
    const tilt =
      middle === 0
        ? 0
        : ((offset / middle) * maxTilt * (i % 2 ? -1 : 1)).toFixed(2);
    return x === 0
      ? `rotate(${tilt}deg)`
      : `rotate(${tilt}deg) translate(${x}px)`;
  });
}

/** Intrinsic width of a row holding `count` cards. */
export function rowWidth(count, { cardSize, spread }) {
  return cardSize + spread * Math.max(0, count - 1) + 60;
}
