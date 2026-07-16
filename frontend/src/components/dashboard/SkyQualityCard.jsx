import { lazy, Suspense } from "react";
import { Moon, MapPin, Compass } from "lucide-react";

import { useSkyQuality } from "../../hooks/useRecommendations";

// MapLibre rides in its own chunk; the readouts render instantly without it.
const SkyQualityMap = lazy(() => import("./SkyQualityMap"));

/**
 * Sky Quality — "how dark is MY sky, and where nearby is it darker?"
 *
 * Data comes from the astro engine's sampling of the Lorenz light-pollution
 * atlas (real radiance values, not map-pixel colors). The darker-sites list
 * is an escalating ladder: the quick win close by, then the nearest genuinely
 * dark options — each a place a user can actually drive to tonight.
 */

/** Bortle class -> the atlas legend's hue, as a badge. */
const BORTLE_TONE = {
  1: "border-line bg-surface-3 text-ink",
  2: "border-line bg-surface-3 text-ink-2",
  3: "border-accent/40 bg-accent/15 text-accent-hi",
  4: "border-success/40 bg-success/15 text-success",
  5: "border-warning/40 bg-warning/15 text-warning",
  6: "border-warning/40 bg-warning/15 text-warning",
  7: "border-danger/40 bg-danger/15 text-danger",
  8: "border-danger/40 bg-danger/15 text-danger",
  9: "border-danger/40 bg-danger/15 text-danger",
};

function BortleBadge({ bortle, className = "" }) {
  if (bortle == null) return null;
  return (
    <span
      className={`inline-flex shrink-0 items-center border px-2 py-0.5 text-[11px] font-bold ${BORTLE_TONE[bortle]} ${className}`}
      title={`Bortle class ${bortle} (1 = pristine, 9 = inner city)`}
    >
      Bortle {bortle}
    </span>
  );
}

export default function SkyQualityCard() {
  const sky = useSkyQuality();

  if (!sky.located) return null;

  return (
    <section className="flex h-full flex-col border border-line bg-surface-2">
      <header className="flex items-center gap-3 border-b border-line px-5 py-3.5">
        <Moon size={16} className="shrink-0 text-accent" />
        <h2 className="min-w-0 flex-1 truncate text-[11px] font-medium uppercase tracking-[0.2em] text-ink-3">
          Sky quality
        </h2>
        <BortleBadge bortle={sky.sample?.bortle} />
      </header>

      {sky.isLoading ? (
        <div className="flex-1 px-5 py-4">
          <div className="h-[220px] animate-pulse border border-line bg-surface-3" />
          <div className="mt-3 h-10 animate-pulse border border-line bg-surface-3" />
        </div>
      ) : sky.isError || !sky.sample ? (
        <p className="px-5 py-4 text-sm text-ink-3">
          The light-pollution atlas is unreachable right now — sky-quality data
          will return when it is.
        </p>
      ) : (
        <>
          <Suspense
            fallback={<div className="h-[220px] animate-pulse bg-surface-3" />}
          >
            <SkyQualityMap
              latitude={sky.latitude}
              longitude={sky.longitude}
              sites={sky.sites}
            />
          </Suspense>

          {/* Readout: what the atlas says about the observer's own pixel. */}
          <div className="grid grid-cols-3 gap-px border-t border-line bg-line">
            <div className="bg-surface-2 px-4 py-2.5">
              <p className="text-[10px] uppercase tracking-wide text-ink-3">Sky zone</p>
              <p className="mt-0.5 truncate text-sm font-semibold capitalize text-ink">
                {sky.sample.zone}
              </p>
            </div>
            <div className="bg-surface-2 px-4 py-2.5">
              <p className="text-[10px] uppercase tracking-wide text-ink-3">Brightness</p>
              <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-ink">
                {sky.sample.mpsas}
                <span className="ml-1 text-[10px] font-normal text-ink-3">mag/arcsec²</span>
              </p>
            </div>
            <div className="bg-surface-2 px-4 py-2.5">
              <p className="text-[10px] uppercase tracking-wide text-ink-3">Atlas</p>
              <p className="mt-0.5 text-sm font-semibold text-ink">
                {sky.atlasYear ?? "—"}
              </p>
            </div>
          </div>

          {/* Darker skies nearby — the "where should I drive?" answer. */}
          <div className="flex-1 border-t border-line px-5 py-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-ink-3">
              Darker skies nearby
            </p>
            {sky.sites.length === 0 ? (
              <p className="mt-2 text-sm text-ink-3">
                {sky.sample.bortle <= 3
                  ? "You're already under a genuinely dark sky — nowhere meaningfully better within range."
                  : `Nothing meaningfully darker within ${sky.searchedKm ?? 150} km of you.`}
              </p>
            ) : (
              <ul className="mt-2 flex flex-col gap-1.5">
                {sky.sites.map((site) => (
                  <li
                    key={`${site.latitude},${site.longitude}`}
                    className="flex items-center gap-3 border border-line bg-surface-3 px-3 py-2"
                  >
                    <MapPin size={13} className="shrink-0 text-success" />
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">
                      {site.place || "Open country"}
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-[11px] tabular-nums text-ink-3">
                      <Compass size={11} />
                      {site.distance_km} km {site.bearing}
                    </span>
                    <BortleBadge bortle={site.bortle} />
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2.5 text-[10px] leading-relaxed text-ink-4">
              Estimates from satellite radiance data — verify a site is safe and
              accessible before heading out.
            </p>
          </div>
        </>
      )}
    </section>
  );
}
