import { Link } from "react-router-dom";

import { Navbar } from "../components/Navbar";
import Starfield from "../components/tonight/Starfield";
import GuideJourney from "../components/guide/GuideJourney";
import { GUIDE_STEPS } from "../components/guide/guide.steps";
import { useGuideProgress } from "../hooks/useGuideProgress";
import { useAuth } from "../context/AuthContext";

/**
 * /guide — the First Light Guide, rebuilt as a JOURNEY: a trail you walk from
 * sign-up to a logged observation, in the /tonight visual language. Public (it
 * doubles as the product tour); for a signed-in observer completed steps light
 * their node green and the header shows a progress count. The scroll-driven
 * path lives in GuideJourney (GSAP ScrollTrigger); this page owns the hero,
 * progress and closing destination.
 */
export default function Guide() {
  const { isAuthenticated } = useAuth();
  const { done, completed, trackable } = useGuideProgress();

  return (
    <div className="relative min-h-screen bg-bg text-ink">
      <Starfield />

      <div className="relative z-20">
        <Navbar />
      </div>

      {/* Hero */}
      <header className="relative z-10 mx-auto w-full max-w-4xl px-6 pt-10 pb-16 text-center sm:px-12 sm:pt-16">
        <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-accent">
          First Light Guide
        </p>
        <h1 className="mx-auto mt-4 max-w-3xl text-[clamp(2.2rem,5.5vw,4rem)] font-black uppercase leading-[1] tracking-tight text-ink">
          From sign-up to the eyepiece
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-ink-2 sm:text-lg">
          Nine steps, one path. Follow the trail from the top
          {isAuthenticated ? " — your progress lights up as you go." : "."}
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

      {/* The journey */}
      <main className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-16 sm:px-12">
        <GuideJourney steps={GUIDE_STEPS} done={done} />
      </main>

      {/* Destination CTA */}
      <section className="relative z-10 mx-auto w-full max-w-4xl px-6 pb-24 sm:px-12">
        <div className="border border-accent/25 bg-accent/5 px-6 py-10 text-center">
          <h2 className="text-2xl font-black uppercase tracking-tight text-ink sm:text-3xl">
            That's the whole loop.
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-2">
            Decide, point, log — then do it again tomorrow night.
          </p>
          <Link
            to={isAuthenticated ? "/tonight" : "/login"}
            className="mt-6 inline-block bg-accent px-7 py-3 font-semibold text-ink transition-colors duration-300 hover:bg-accent-hi"
          >
            {isAuthenticated ? "See tonight's sky" : "Start observing"}
          </Link>
        </div>
      </section>
    </div>
  );
}
