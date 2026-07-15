import SpotlightCard from "./fx/SpotlightCard";
import ScoreRing from "./fx/ScoreRing";
import {
  compassPoint,
  formatDegrees,
  formatDistance,
  formatMagnitude,
  typeMeta,
} from "./vocabulary";

/**
 * Tonight's recommendations — a cinematic #1 feature card followed by the
 * ranked runner-up rows. Ranking comes straight from the engine; this
 * component only presents it.
 */

function FeaturedTarget({ target, onSelect }) {
  const meta = typeMeta(target.object_type);
  const facts = [
    ["Altitude", formatDegrees(target.altitude_deg)],
    ["Azimuth", `${formatDegrees(target.azimuth_deg)} ${compassPoint(target.azimuth_deg)}`],
    ["Magnitude", formatMagnitude(target.magnitude)],
    ["Distance", formatDistance(target.distance_ly)],
    ["Difficulty", target.difficulty || "—"],
    ["Constellation", target.constellation || "—"],
  ];

  return (
    <SpotlightCard
      data-reveal
      className="cursor-pointer p-8 transition-colors hover:border-accent/30 sm:p-10"
      onClick={() => onSelect?.(target.catalog_id)}
    >
      <div className="flex flex-col gap-8 lg:flex-row lg:items-center">
        <div className="flex-1">
          <p className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.3em] text-accent">
            <span className="rounded-lg border border-accent/40 bg-accent/10 px-2.5 py-1 text-sm font-bold normal-case tracking-normal">
              № 1
            </span>
            Tonight's best target
          </p>
          <h3 className="mt-4 text-4xl font-bold text-ink sm:text-5xl">
            {target.name || target.catalog_id}
          </h3>
          <p className="mt-1 text-sm text-ink-2">
            {target.catalog_id} · {meta.symbol} {meta.label}
            {target.aliases?.length > 0 && ` · “${target.aliases[0]}”`}
          </p>
          {target.description && (
            <p className="mt-5 max-w-2xl leading-relaxed text-ink-2">
              {target.description}
            </p>
          )}
          {target.tips?.length > 0 && (
            <p className="mt-4 border-l-2 border-accent/50 pl-4 text-sm italic text-ink-2">
              {target.tips[0]}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-center gap-6">
          <ScoreRing score={target.visibility_score} size={128} strokeWidth={6} />
          <dl className="grid grid-cols-2 gap-x-8 gap-y-3">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt className="text-[10px] uppercase tracking-[0.2em] text-ink-3">
                  {label}
                </dt>
                <dd className="text-sm font-medium tabular-nums text-ink">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </SpotlightCard>
  );
}

function TargetRow({ target, onSelect }) {
  const meta = typeMeta(target.object_type);
  return (
    <button
      type="button"
      data-reveal
      onClick={() => onSelect?.(target.catalog_id)}
      className="group flex w-full min-w-0 items-center gap-4 overflow-hidden rounded-2xl border border-line bg-surface-2 px-5 py-4 text-left transition-colors duration-300 hover:bg-surface-3 sm:gap-6"
    >
      <span className="w-8 shrink-0 text-lg font-bold tabular-nums text-ink-3 group-hover:text-accent">
        {String(target.rank).padStart(2, "0")}
      </span>
      <ScoreRing score={target.visibility_score} size={48} strokeWidth={3.5} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-ink">
          {target.name || target.catalog_id}
        </span>
        <span className="block truncate text-xs text-ink-2">
          {target.catalog_id} · {meta.label} · {target.constellation || "—"}
        </span>
      </span>
      <span className="hidden shrink-0 text-right text-xs tabular-nums text-ink-2 sm:block">
        <span className="block">Alt {formatDegrees(target.altitude_deg)}</span>
        <span className="block text-ink-3">
          {compassPoint(target.azimuth_deg)} · mag{" "}
          {formatMagnitude(target.magnitude)}
        </span>
      </span>
      <span className="shrink-0 text-ink-3 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-accent">
        →
      </span>
    </button>
  );
}

export default function TopTargets({ targets, onSelect }) {
  if (!targets.length) return null;
  const [featured, ...rest] = targets.slice(0, 10);

  return (
    <section className="mx-auto w-full max-w-7xl px-6 sm:px-12">
      <div data-reveal className="mb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-accent">
          Recommendations
        </p>
        <h2 className="mt-2 text-3xl font-bold text-ink sm:text-4xl">
          What to point at first
        </h2>
      </div>

      <FeaturedTarget target={featured} onSelect={onSelect} />

      <div data-reveal-group className="mt-4 grid gap-3 lg:grid-cols-2">
        {rest.map((target) => (
          <TargetRow key={target.catalog_id} target={target} onSelect={onSelect} />
        ))}
      </div>
    </section>
  );
}
