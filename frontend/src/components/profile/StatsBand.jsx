import { Link } from "react-router-dom";

/**
 * Observing résumé strip — the numbers that make a profile feel earned, plus
 * a "recent objects" row that links each into its target panel. Shared by the
 * private and public profile pages (public omits the planned count).
 */
export default function StatsBand({ stats, showPlanned = false }) {
  if (!stats) return null;

  const tiles = [
    { label: "Objects observed", value: stats.objectsObserved ?? 0 },
    showPlanned && { label: "On the plan", value: stats.planned ?? 0 },
    showPlanned && { label: "Total logged", value: stats.totalLogged ?? 0 },
  ].filter(Boolean);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="border border-line bg-surface-2 px-4 py-3 text-center"
          >
            <p className="text-2xl font-black tabular-nums text-ink">{tile.value}</p>
            <p className="mt-0.5 text-[11px] uppercase tracking-[0.15em] text-ink-3">
              {tile.label}
            </p>
          </div>
        ))}
      </div>

      {stats.recent?.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-ink-3">
            Recently observed
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {stats.recent.map((id) => (
              <Link
                key={id}
                to={`/tonight/${id}`}
                className="border border-line bg-surface-2 px-3 py-1.5 text-xs font-medium text-ink-2 transition-colors hover:border-accent hover:text-accent"
              >
                {id}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
