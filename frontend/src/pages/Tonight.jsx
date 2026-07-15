import { useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";

import Starfield from "../components/tonight/Starfield";
import TonightHero from "../components/tonight/TonightHero";
import StatStrip from "../components/tonight/StatStrip";
import SkyDome from "../components/tonight/SkyDome";
import TopTargets from "../components/tonight/TopTargets";
import MoonPanel from "../components/tonight/MoonPanel";
import ConditionsPanel from "../components/tonight/ConditionsPanel";
import CatalogTable from "../components/tonight/CatalogTable";
import { useReveal } from "../components/tonight/fx/useReveal";
import { useTonight } from "../hooks/useTonight";

/**
 * /tonight — the personalized celestial recommendation experience.
 *
 * A standalone immersive route (own night-sky canvas, outside AppLayout, like
 * Alignment Mode) composed of: cinematic hero -> live stat readout -> all-sky
 * chart -> ranked recommendations -> Moon + conditions dossiers -> the full
 * deep-sky ledger. All science comes from the Astro Engine via useTonight.
 * Every object click navigates to its Detailed Target Panel (/tonight/:id).
 */

function CenteredShell({ children }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-bg px-6 text-ink">
      <Starfield />
      <div className="max-w-md text-center">{children}</div>
    </div>
  );
}

function LoadingState() {
  return (
    <CenteredShell>
      <div className="mx-auto mb-6 h-14 w-14 animate-spin rounded-full border-2 border-line border-t-accent" />
      <h1 className="text-2xl font-black uppercase tracking-tight">Computing your sky…</h1>
      <p className="mt-2 text-sm text-ink-2">
        Transforming the catalog to your horizon — coordinates, Moon, and
        atmosphere, calculated for this exact instant.
      </p>
    </CenteredShell>
  );
}

function NoLocationState() {
  return (
    <CenteredShell>
      <p className="text-[11px] uppercase tracking-[0.3em] text-accent">
        Tonight
      </p>
      <h1 className="mt-3 text-3xl font-bold">Where are you observing from?</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-2">
        Tonight's sky is computed for your exact coordinates. Set your observer
        location on the dashboard and this page comes alive.
      </p>
      <Link
        to="/dashboard"
        className="mt-6 inline-block bg-accent px-6 py-3 font-semibold text-ink transition-colors hover:bg-accent-hi"
      >
        Set my location
      </Link>
    </CenteredShell>
  );
}

function ErrorState({ onRetry }) {
  return (
    <CenteredShell>
      <p className="text-[11px] uppercase tracking-[0.3em] text-danger">
        Signal lost
      </p>
      <h1 className="mt-3 text-3xl font-black uppercase tracking-tight">The sky didn't answer</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-2">
        We couldn't reach the Astro Engine. Check that it's running, then try
        again.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 border border-line bg-surface-2 px-6 py-3 font-semibold text-ink transition-colors hover:bg-surface-3"
      >
        Retry
      </button>
    </CenteredShell>
  );
}

export default function Tonight() {
  const scope = useRef(null);
  const navigate = useNavigate();
  const tonight = useTonight();

  const {
    located,
    isLoading,
    isError,
    targets,
    belowHorizon,
    moon,
    weather,
    conditions,
    latitude,
    longitude,
    timezone,
    refetch,
  } = tonight;

  const ready = located && !isLoading && !isError;
  useReveal(scope, ready);

  const openTarget = useCallback(
    (catalogId) => navigate(`/tonight/${catalogId}`),
    [navigate],
  );

  if (!located) return <NoLocationState />;
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div ref={scope} className="relative min-h-screen bg-bg text-ink">
      <Starfield />

      {/* Slim top bar — a quiet way back to the workspace. */}
      <nav className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-5 sm:px-12">
        <Link
          to="/dashboard"
          className="border border-line bg-surface-2 px-4 py-2 text-sm text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink"
        >
          ← Dashboard
        </Link>
        <span className="text-sm font-black uppercase tracking-tight text-ink">
          SkyGuide <span className="text-accent">AI</span>
        </span>
      </nav>

      <TonightHero
        latitude={latitude}
        longitude={longitude}
        timezone={timezone}
        visibleCount={targets.length}
        moon={moon}
        conditions={conditions}
      />

      <main className="relative z-10 flex flex-col gap-24 pb-32">
        <StatStrip targets={targets} moon={moon} conditions={conditions} />

        <SkyDome targets={targets} moon={moon} onSelect={openTarget} />

        <TopTargets targets={targets} onSelect={openTarget} />

        <section
          data-reveal-group
          className="mx-auto grid w-full max-w-7xl gap-4 px-6 sm:px-12 lg:grid-cols-2"
        >
          <MoonPanel moon={moon} />
          <ConditionsPanel weather={weather} conditions={conditions} />
        </section>

        <CatalogTable
          targets={targets}
          belowHorizon={belowHorizon}
          onSelect={openTarget}
        />

        <footer className="mx-auto w-full max-w-7xl px-6 text-center sm:px-12">
          <p className="text-xs leading-relaxed text-ink-3">
            Geometry by Astropy on the SkyGuide Astro Engine · recomputed every
            five minutes for {latitude?.toFixed(3)}°, {longitude?.toFixed(3)}° ·
            scores blend altitude, brightness and apparent size.
          </p>
        </footer>
      </main>
    </div>
  );
}
