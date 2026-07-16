import { Link } from "react-router-dom";

import { typeMeta, formatMagnitude } from "../tonight/vocabulary";
import { useSimilarObjects } from "../../hooks/useSimilarObjects";

/**
 * "Related objects" rail on the target panel — the second half of making the
 * page a place you can *explore from*, not just land on. Each row navigates to
 * that object's own panel, so an observer can hop galaxy → galaxy or wander a
 * constellation without going back to a list.
 */
export default function SimilarObjects({ target }) {
  const { objects, isLoading } = useSimilarObjects(target);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse border border-line bg-surface-2" />
        ))}
      </div>
    );
  }

  if (objects.length === 0) {
    return (
      <p className="text-sm text-ink-3">
        No related objects in the catalog for this one.
      </p>
    );
  }

  return (
    <ul className="space-y-1.5">
      {objects.map((obj) => {
        const meta = typeMeta(obj.object_type);
        return (
          <li key={obj.catalog_id}>
            <Link
              to={`/tonight/${encodeURIComponent(obj.catalog_id)}`}
              className="group flex items-center gap-3 border border-line bg-surface-2 p-2 transition-colors hover:bg-surface-3 hover:outline hover:outline-1 hover:outline-accent"
            >
              {/* Thumbnail (a real DSS/photo cutout) or the type glyph. */}
              {obj.thumbnail ? (
                <img
                  src={obj.thumbnail}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-10 w-10 shrink-0 border border-line object-cover"
                />
              ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-line bg-surface-1 text-lg text-accent/40">
                  {meta.symbol}
                </span>
              )}

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink group-hover:text-accent">
                  {obj.name || obj.catalog_id}
                </span>
                <span className="block truncate text-[11px] text-ink-3">
                  {obj.catalog_id} · {meta.label}
                  {obj.sameConstellation && obj.constellation
                    ? ` · ${obj.constellation}`
                    : ""}
                </span>
              </span>

              <span className="shrink-0 text-[11px] tabular-nums text-ink-3">
                {formatMagnitude(obj.magnitude)}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
