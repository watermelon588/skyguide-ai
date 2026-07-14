import { useEffect } from "react";
import gsap from "gsap";

/**
 * Scroll-choreography for immersive pages (/tonight, /home, /guide).
 *
 * Any descendant with `data-reveal` rises into place as it enters the
 * viewport; siblings under a shared `data-reveal-group` stagger together.
 *
 * Deliberately NOT GSAP ScrollTrigger: with `once` triggers and async content
 * that shifts layout (the landing-page live teaser, lazy data), ScrollTrigger's
 * start positions go stale and elements can get stuck at opacity 0 forever.
 * Instead we trigger on live getBoundingClientRect checks (scroll + resize +
 * a few delayed passes to catch async settling), and a synchronous safety net
 * force-shows anything in view that's still hidden — so content is NEVER
 * permanently invisible, in any scroll container or timing race.
 *
 * `ready` gates setup until real content (not skeletons) is in the DOM.
 */
export function useReveal(scopeRef, ready) {
  useEffect(() => {
    if (!ready) return undefined;
    const root = scopeRef.current;
    if (!root) return undefined;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // A "unit" is one reveal beat: a group (stagger its children) or a lone
    // element. Groups are collected first so their children are excluded below.
    const units = [];
    root.querySelectorAll("[data-reveal-group]").forEach((group) => {
      const children = [...group.querySelectorAll("[data-reveal]")];
      if (children.length) units.push({ trigger: group, targets: children });
    });
    root.querySelectorAll("[data-reveal]").forEach((el) => {
      if (!el.closest("[data-reveal-group]")) {
        units.push({ trigger: el, targets: [el] });
      }
    });
    if (!units.length) return undefined;

    if (reduced) {
      // No motion — just make sure everything is visible.
      units.forEach((u) => gsap.set(u.targets, { opacity: 1, y: 0 }));
      return undefined;
    }

    // Hidden start state — a synchronous set, safe even if rAF is throttled.
    units.forEach((u) => gsap.set(u.targets, { opacity: 0, y: 28 }));

    const pending = new Set(units);
    const animateIn = (u) => {
      if (!pending.has(u)) return;
      pending.delete(u);
      // A hidden tab freezes the animation ticker — so just show the finished
      // state (synchronous, unfreezable). The reveal is only worth animating
      // when someone is actually watching.
      if (document.hidden) {
        gsap.set(u.targets, { opacity: 1, y: 0 });
        return;
      }
      gsap.to(u.targets, {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger: u.targets.length > 1 ? 0.08 : 0,
        overwrite: true,
      });
    };

    let timers = [];
    const cleanup = () => {
      window.removeEventListener("scroll", check, { capture: true });
      window.removeEventListener("resize", check);
      timers.forEach(clearTimeout);
      timers = [];
    };

    // Reveal every unit whose trigger has entered the viewport.
    function check() {
      const vh = window.innerHeight;
      for (const u of [...pending]) {
        const r = u.trigger.getBoundingClientRect();
        if (r.top < vh * 0.9 && r.bottom > 0) animateIn(u);
      }
      if (!pending.size) cleanup();
    }

    window.addEventListener("scroll", check, { capture: true, passive: true });
    window.addEventListener("resize", check);
    check();
    // Catch async layout settling (the teaser resolving, images, fonts).
    [150, 700, 1400].forEach((ms) => timers.push(setTimeout(check, ms)));

    // Last resort: after 2.5s, force-show anything IN VIEW that's still hidden
    // (a synchronous set works even when the animation ticker is throttled).
    // Genuinely below-the-fold units stay hidden until scrolled to.
    timers.push(
      setTimeout(() => {
        const vh = window.innerHeight;
        for (const u of [...pending]) {
          if (u.trigger.getBoundingClientRect().top < vh) {
            gsap.set(u.targets, { opacity: 1, y: 0 });
            pending.delete(u);
          }
        }
        if (!pending.size) cleanup();
      }, 2500),
    );

    return cleanup;
  }, [ready, scopeRef]);
}
