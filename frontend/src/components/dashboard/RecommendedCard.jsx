import { Link } from "react-router-dom";
import { Sparkles, Crosshair, ArrowRight } from "lucide-react";

import { useRecommendations } from "../../hooks/useRecommendations";
import { useObserveTarget } from "../../hooks/useObserveTarget";
import { typeMeta } from "../tonight/vocabulary";

/**
 * "Recommended for you" (Feature 8, Phase A) — tonight's sky ranked for THIS
 * observer: their aperture, their eyepiece view, their light pollution, their
 * history. Every row explains itself (reason chips) and carries the best
 * observing window; the Observe button is the same one-click guidance path as
 * everywhere else (useObserveTarget).
 *
 * Transparency is the product: this card never shows a score without at least
 * hinting at why.
 */

const SHOW_COUNT = 5;
const CHIP_COUNT = 2;

function WindowLine({ window }) {
  if (!window) {
    return (
      <span className="text-[11px] text-ink-4">
        No dark-sky window tonight
      </span>
    );
  }
  return (
    <span className="text-[11px] tabular-nums text-ink-3">
      Best {window.start}–{window.end}
      {window.peak && (
        <>
          {" · "}peak <span className="text-ink-2">{window.peak}</span>
        </>
      )}
    </span>
  );
}

export default function RecommendedCard() {
  const recs = useRecommendations({ limit: SHOW_COUNT });
  const observeTarget = useObserveTarget();

  return (
    <section className="flex h-full flex-col border border-line bg-surface-2">
      <header className="flex items-center gap-3 border-b border-line px-5 py-3.5">
        <Sparkles size={16} className="shrink-0 text-accent" />
        <h2 className="min-w-0 flex-1 truncate text-[11px] font-medium uppercase tracking-[0.2em] text-ink-3">
          Recommended for you
        </h2>
        {recs.telescopeUsed?.aperture_mm && (
          <span className="shrink-0 text-[11px] text-ink-3">
            for your {Math.round(recs.telescopeUsed.aperture_mm)} mm
          </span>
        )}
      </header>

      <div className="flex-1 px-5 py-4">
        {recs.isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: SHOW_COUNT }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse border border-line bg-surface-3" />
            ))}
          </div>
        ) : recs.isError ? (
          <p className="text-sm text-ink-3">
            The recommendation engine is unreachable right now — the ranked
            list on <Link to="/tonight" className="text-accent hover:text-accent-hi">Tonight</Link> still works.
          </p>
        ) : recs.objects.length === 0 ? (
          <p className="text-sm text-ink-3">
            Nothing above your horizon right now. Check back after dusk.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {recs.objects.slice(0, SHOW_COUNT).map((obj) => {
              const meta = typeMeta(obj.object_type);
              return (
                <li
                  key={obj.catalog_id}
                  className="group flex items-center gap-3 border border-line bg-surface-3 px-3 py-2.5 transition-colors hover:bg-surface-2 hover:outline hover:outline-1 hover:outline-accent"
                >
                  <span aria-hidden="true" className="shrink-0 text-lg text-accent/70">
                    {meta.symbol}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <Link
                        to={`/tonight/${obj.catalog_id}`}
                        className="truncate text-sm font-semibold text-ink transition-colors hover:text-accent-hi"
                      >
                        {obj.name || obj.catalog_id}
                      </Link>
                      <span className="shrink-0 font-mono text-[11px] text-ink-4">
                        {obj.catalog_id}
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <WindowLine window={obj.best_window} />
                      {obj.reasons.slice(0, CHIP_COUNT).map((reason) => (
                        <span
                          key={reason}
                          className="border border-line bg-surface-2 px-1.5 py-0.5 text-[10px] text-ink-3"
                        >
                          {reason}
                        </span>
                      ))}
                    </div>
                  </div>

                  <span
                    className="shrink-0 font-mono text-sm font-bold tabular-nums text-ink"
                    title="Personalized score"
                  >
                    {obj.recommendation_score}
                  </span>
                  <button
                    type="button"
                    onClick={() => observeTarget(obj.catalog_id)}
                    title={`Start guided observing on ${obj.catalog_id}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center border border-line bg-surface-2 text-ink-2 transition-colors hover:border-accent hover:bg-accent hover:text-ink"
                  >
                    <Crosshair size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <footer className="border-t border-line px-5 py-2.5">
        <Link
          to="/tonight"
          className="inline-flex items-center gap-1.5 text-xs text-ink-3 transition-colors hover:text-ink"
        >
          Full ranked sky <ArrowRight size={12} />
        </Link>
      </footer>
    </section>
  );
}
