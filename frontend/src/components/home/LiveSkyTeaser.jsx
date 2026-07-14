import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

import ScoreRing from "../tonight/fx/ScoreRing";
import { fetchObservable, fetchMoon } from "../../services/tonight.service";
import { typeMeta } from "../tonight/vocabulary";

/**
 * Landing-page live teaser — "the sky right now, computed for real."
 *
 * Hits the PUBLIC astro-engine (visibility + moon, no auth) for a showcase
 * dark-sky site so an anonymous visitor sees genuine live data before signing
 * up. Degrades gracefully: a skeleton while loading, and an inviting static
 * panel (never an error) when the engine/DB is unreachable — so the section
 * always looks intentional.
 */

// A famous dark-sky site, so the teaser is aspirational and the numbers real.
const DEMO = {
  latitude: 31.9583,
  longitude: -111.5967,
  timezone: "America/Phoenix",
  label: "Kitt Peak, Arizona",
};

function useSkyPreview() {
  return useQuery({
    queryKey: ["sky-preview", DEMO.latitude, DEMO.longitude],
    queryFn: async () => {
      const [visibility, moon] = await Promise.all([
        fetchObservable(DEMO),
        fetchMoon(DEMO),
      ]);
      return { objects: visibility.objects ?? [], moon: moon.moon ?? null };
    },
    retry: false, // fail fast to the graceful fallback when the engine is down
    staleTime: 5 * 60 * 1000,
  });
}

function TargetLine({ target }) {
  const meta = typeMeta(target.object_type);
  return (
    <div className="flex items-center gap-3">
      <ScoreRing score={target.visibility_score} size={40} strokeWidth={3} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-ink">
          {target.name || target.catalog_id}
        </span>
        <span className="block truncate text-[11px] text-ink-3">
          {target.catalog_id} · {meta.label}
        </span>
      </span>
    </div>
  );
}

function Frame({ children, live }) {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 sm:px-12">
      <div className="relative border border-line bg-surface-2 p-8 sm:p-10">
        <div className="relative flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.3em] text-accent">
          <span className="relative flex h-2 w-2">
            {live && (
              <span className="absolute inline-flex h-full w-full animate-ping bg-accent opacity-60" />
            )}
            <span className="relative inline-flex h-2 w-2 bg-accent" />
          </span>
          The sky, computed live
          <span className="ml-auto normal-case tracking-normal text-ink-3">
            {DEMO.label}
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function LiveSkyTeaser({ onReady }) {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useSkyPreview();

  useEffect(() => {
    if (!isLoading) {
      onReady?.();
    }
  }, [isLoading, onReady]);

  const top = data?.objects?.slice(0, 3) ?? [];
  const visibleCount = data?.objects?.length ?? 0;
  const moon = data?.moon ?? null;
  const unavailable = isError || (!isLoading && visibleCount === 0);

  return (
    <section data-reveal className="relative z-10">
      {isLoading ? (
        <Frame live={false}>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 animate-pulse bg-surface-3" />
            ))}
          </div>
        </Frame>
      ) : unavailable ? (
        <Frame live={false}>
          <p className="mt-5 max-w-xl text-lg font-semibold text-ink">
            This is where tonight's sky appears — ranked, live, for your exact
            location.
          </p>
          <p className="mt-2 max-w-xl text-sm text-ink-2">
            Sign in and it fills with every object above your horizon right
            now, scored and ready to observe.
          </p>
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/login")}
            className="mt-6 inline-flex items-center gap-2 bg-accent px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-accent-hi"
          >
            <Sparkles size={15} />
            Compute my sky
          </motion.button>
        </Frame>
      ) : (
        <Frame live>
          <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-5xl font-black tabular-nums text-ink">
                {visibleCount}
                <span className="ml-3 text-base font-medium text-ink-2">
                  objects up right now
                </span>
              </p>
              {moon && (
                <p className="mt-1 text-sm text-ink-3">
                  {moon.phase} · {moon.illumination}% illuminated
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="text-sm font-medium text-accent transition-colors hover:text-accent-hi"
            >
              See your own sky →
            </button>
          </div>

          <div className="mt-6 grid gap-4 border-t border-line pt-6 sm:grid-cols-3">
            {top.map((target) => (
              <TargetLine key={target.catalog_id} target={target} />
            ))}
          </div>
        </Frame>
      )}
    </section>
  );
}
