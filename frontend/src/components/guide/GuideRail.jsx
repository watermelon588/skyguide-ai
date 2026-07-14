import { Check } from "lucide-react";

/**
 * Smoothly scroll the window to `top`, animated by rAF rather than the native
 * `behavior: "smooth"` — which some engines (and headless Chromium) silently
 * no-op. Respects prefers-reduced-motion by jumping instantly.
 */
function smoothScrollTo(top) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const start = window.scrollY;
  const distance = top - start;
  if (reduced || Math.abs(distance) < 4) {
    window.scrollTo(0, top);
    return;
  }
  const duration = 450;
  const startTime = performance.now();
  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const step = (now) => {
    const progress = Math.min((now - startTime) / duration, 1);
    window.scrollTo(0, start + distance * easeInOut(progress));
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/**
 * Sticky step rail (desktop) — a vertical index of the nine steps that
 * doubles as a checklist. Each entry scrolls its step into view; trackable
 * steps the signed-in observer has completed show a green tick.
 */
export default function GuideRail({ steps, done, activeId }) {
  // Computed offset (clears the ~96px sticky top bar), animated by rAF.
  const scrollTo = (id) => {
    const el = document.getElementById(`step-${id}`);
    if (!el) return;
    smoothScrollTo(el.getBoundingClientRect().top + window.scrollY - 100);
  };

  return (
    <nav
      aria-label="Guide steps"
      className="sticky top-24 hidden max-h-[calc(100vh-8rem)] flex-col gap-1 overflow-y-auto lg:flex"
    >
      {steps.map((step, i) => {
        const isDone = done[step.id];
        const isActive = activeId === step.id;
        return (
          <button
            key={step.id}
            type="button"
            onClick={() => scrollTo(step.id)}
            className={`group flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
              isActive
                ? "bg-surface-3 text-ink"
                : "text-ink-2 hover:bg-surface-2 hover:text-ink"
            }`}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center text-[11px] font-bold ${
                isDone
                  ? "bg-success/15 text-success"
                  : isActive
                    ? "bg-accent/15 text-accent"
                    : "bg-surface-2 text-ink-3"
              }`}
            >
              {isDone ? <Check size={13} /> : i + 1}
            </span>
            <span className="truncate">{step.title}</span>
          </button>
        );
      })}
    </nav>
  );
}
