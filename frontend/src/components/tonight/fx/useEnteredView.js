import { useEffect, useState } from "react";

/**
 * True once the element has entered the viewport — checked with
 * getBoundingClientRect on mount and on every scroll/resize until it flips.
 *
 * Deliberately not IntersectionObserver: the animations gated by this hook
 * must fire in any scroll context (window on /tonight, the inner MainContent
 * scroller on the dashboard) and in embedded/webview environments where IO
 * callbacks can be throttled or absent. The capture-phase scroll listener is
 * what catches inner containers — scroll events don't bubble, but they do
 * pass through the capture phase on window. The listener detaches as soon as
 * the element is seen, so steady-state cost is zero.
 */
export function useEnteredView(ref) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (entered) return undefined;
    const el = ref.current;
    if (!el) return undefined;

    const check = () => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.95 && rect.bottom > 0) {
        setEntered(true);
      }
    };

    check();
    window.addEventListener("scroll", check, { capture: true, passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check, { capture: true });
      window.removeEventListener("resize", check);
    };
  }, [ref, entered]);

  return entered;
}
