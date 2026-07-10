import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

/**
 * Scroll-choreography for /tonight sections.
 *
 * Any descendant with `data-reveal` quietly rises into place as it enters the
 * viewport; siblings sharing a `data-reveal-group` parent stagger. One hook at
 * the page root replaces per-component animation wiring.
 *
 * `ready` gates registration until the data (and therefore the real DOM) is
 * present, so triggers measure final layout, not skeletons.
 */
export function useReveal(scopeRef, ready) {
  useGSAP(
    () => {
      if (!ready) return;

      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      const reveal = (targets, stagger = 0) => {
        gsap.from(targets, {
          y: reduced ? 0 : 28,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
          stagger,
          scrollTrigger: {
            trigger: Array.isArray(targets) ? targets[0] : targets,
            start: "top 88%",
            once: true,
          },
        });
      };

      // Grouped children stagger together…
      gsap.utils.toArray("[data-reveal-group]").forEach((group) => {
        const children = group.querySelectorAll("[data-reveal]");
        if (children.length) reveal(children, 0.08);
      });
      // …lone elements rise on their own.
      gsap.utils
        .toArray("[data-reveal]")
        .filter((el) => !el.closest("[data-reveal-group]"))
        .forEach((el) => reveal(el));
    },
    { dependencies: [ready], scope: scopeRef },
  );
}
