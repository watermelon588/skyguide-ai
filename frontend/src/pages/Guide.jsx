import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import Starfield from "../components/tonight/Starfield";
import GuideStep from "../components/guide/GuideStep";
import GuideRail from "../components/guide/GuideRail";
import { GUIDE_STEPS } from "../components/guide/guide.steps";
import { useReveal } from "../components/tonight/fx/useReveal";
import { useGuideProgress } from "../hooks/useGuideProgress";
import { useAuth } from "../context/AuthContext";

/**
 * /guide — the First Light Guide: nine steps from sign-up to a logged
 * observation, in the /tonight visual language. Public (doubles as the
 * product tour); for signed-in observers it becomes a live checklist —
 * trackable steps they've completed show a green tick and the header a
 * progress count. Window-scroll route, so useReveal + the sticky rail work
 * without the dashboard's inner-scroller caveat.
 */
export default function Guide() {
  const scope = useRef(null);
  const { isAuthenticated } = useAuth();
  const { done, completed, trackable } = useGuideProgress();
  const [activeId, setActiveId] = useState(GUIDE_STEPS[0].id);

  useReveal(scope, true);

  // Highlight the step nearest the top of the viewport in the rail.
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        let current = GUIDE_STEPS[0].id;
        for (const step of GUIDE_STEPS) {
          const el = document.getElementById(`step-${step.id}`);
          if (el && el.getBoundingClientRect().top <= 180) current = step.id;
        }
        setActiveId(current);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={scope} className="relative min-h-screen bg-bg text-ink">
      <Starfield />

      <nav className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5 sm:px-12">
        <Link
          to="/"
          className="border border-line bg-surface-2 px-4 py-2 text-sm text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink"
        >
          ← Home
        </Link>
        <Link
          to={isAuthenticated ? "/dashboard" : "/login"}
          className="text-sm font-black uppercase tracking-tight text-ink transition-colors hover:text-accent"
        >
          {isAuthenticated ? "Dashboard" : "Sign in"}
        </Link>
      </nav>

      {/* Hero */}
      <header className="relative z-10 mx-auto w-full max-w-6xl px-6 pt-10 pb-14 text-center sm:px-12 sm:pt-16">
        <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-accent">
          First Light Guide
        </p>
        <h1 className="mx-auto mt-4 max-w-3xl text-[clamp(2.4rem,6vw,4.5rem)] font-black uppercase leading-[1] tracking-tight text-ink">
          From sign-up to the eyepiece
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-ink-2 sm:text-lg">
          Nine steps to your first guided observation. Follow along top to
          bottom{isAuthenticated ? " — your progress ticks off as you go." : "."}
        </p>

        {isAuthenticated && (
          <div className="mx-auto mt-8 flex max-w-md items-center gap-4 border border-line bg-surface-2 px-5 py-3">
            <span className="h-2 flex-1 overflow-hidden bg-surface-3">
              <span
                className="block h-full bg-gradient-to-r from-accent to-accent-hi transition-[width] duration-700"
                style={{ width: `${(completed / trackable) * 100}%` }}
              />
            </span>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">
              {completed}/{trackable}
            </span>
          </div>
        )}
      </header>

      {/* Rail + steps */}
      <main className="relative z-10 mx-auto grid w-full max-w-6xl gap-8 px-6 pb-24 sm:px-12 lg:grid-cols-[220px_1fr]">
        <GuideRail steps={GUIDE_STEPS} done={done} activeId={activeId} />

        <div data-reveal-group className="flex flex-col gap-4">
          {GUIDE_STEPS.map((step, index) => (
            <GuideStep
              key={step.id}
              step={step}
              index={index}
              done={step.track ? done[step.id] : false}
            />
          ))}

          {/* Closing CTA */}
          <div
            data-reveal
            className="mt-4 border border-accent/25 bg-accent/5 px-6 py-8 text-center"
          >
            <h2 className="text-2xl font-black uppercase tracking-tight text-ink">
              That's the whole loop.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-2">
              Decide, point, log — then do it again tomorrow night.
            </p>
            <Link
              to={isAuthenticated ? "/tonight" : "/login"}
              className="mt-5 inline-block bg-accent px-7 py-3 font-semibold text-ink transition-colors duration-300 hover:bg-accent-hi"
            >
              {isAuthenticated ? "See tonight's sky" : "Start observing"}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
