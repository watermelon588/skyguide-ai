import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import SpotlightCard from "../tonight/fx/SpotlightCard";
import ScoreRing from "../tonight/fx/ScoreRing";
import CountUp from "../tonight/fx/CountUp";
import AddToPlanButton from "../plan/AddToPlanButton";
import {
  compassPoint,
  formatDegrees,
  formatMagnitude,
  typeMeta,
} from "../tonight/vocabulary";

/**
 * "Tonight at a glance" — the dashboard's information core. Live stat tiles,
 * the top five ranked targets, and field notes (dynamic guidance derived from
 * the same engine data). Everything links into the full /tonight experience.
 */

function statTiles({ targets, moon, conditions }) {
  return [
    { label: "Objects up", value: targets.length },
    {
      label: "Top score",
      value: targets.length ? targets[0].visibility_score : null,
    },
    {
      label: "Moon",
      value: moon?.illumination ?? null,
      suffix: "%",
      decimals: 1,
    },
    {
      label: "Sky score",
      value: conditions?.observing_score ?? null,
    },
  ];
}

/** Dynamic, data-derived guidance — never generic filler. */
function fieldNotes({ targets, moon, conditions }) {
  const notes = [];
  if (targets.length) {
    const top = targets[0];
    notes.push(
      `Start with ${top.name || top.catalog_id} — score ${top.visibility_score}, ` +
        `${formatDegrees(top.altitude_deg)} up toward ${compassPoint(top.azimuth_deg)}.`,
    );
  }
  if (moon) {
    notes.push(
      moon.above_horizon
        ? `${moon.phase} (${moon.illumination}% lit) is above the horizon — favor bright clusters over faint nebulae.`
        : `The Moon is below your horizon${moon.moonrise ? ` until ${moon.moonrise}` : ""} — prime time for faint deep-sky targets.`,
    );
  }
  if (conditions?.recommendation) {
    notes.push(conditions.recommendation);
  }
  return notes.slice(0, 3);
}

function TargetRow({ target, onOpen }) {
  const meta = typeMeta(target.object_type);
  // A div-with-button-semantics (not <button>) so the nested AddToPlanButton
  // stays valid HTML; Enter/Space keep it keyboard-operable.
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="group flex w-full min-w-0 cursor-pointer items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-left transition-colors duration-300 hover:border-white/10 hover:bg-white/10"
    >
      <span className="w-6 shrink-0 text-sm font-bold tabular-nums text-[#6B7280] group-hover:text-[#FF8C1A]">
        {target.rank}
      </span>
      <ScoreRing score={target.visibility_score} size={38} strokeWidth={3} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-white">
          {target.name || target.catalog_id}
        </span>
        <span className="block truncate text-[11px] text-[#6B7280]">
          {target.catalog_id} · {meta.label}
        </span>
      </span>
      <span className="hidden shrink-0 text-right text-[11px] tabular-nums text-[#AAB4C5] sm:block">
        <span className="block">
          {formatDegrees(target.altitude_deg)} {compassPoint(target.azimuth_deg)}
        </span>
        <span className="block text-[#6B7280]">
          mag {formatMagnitude(target.magnitude)}
        </span>
      </span>
      <AddToPlanButton catalogId={target.catalog_id} />
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="h-[54px] animate-pulse rounded-xl bg-white/5"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  );
}

export default function TonightGlance({
  targets,
  moon,
  conditions,
  isLoading,
  isError,
}) {
  const navigate = useNavigate();
  const notes = fieldNotes({ targets, moon, conditions });

  return (
    <SpotlightCard className="flex h-full flex-col p-6">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-[#FF8C1A]">
            Tonight at a glance
          </p>
          <p className="mt-1 text-xs text-[#6B7280]">
            live geometry for your coordinates
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/tonight")}
          className="group flex shrink-0 items-center gap-1.5 text-xs font-medium text-[#AAB4C5] transition-colors duration-300 hover:text-[#FF8C1A]"
        >
          Full report
          <ArrowRight
            size={13}
            className="transition-transform duration-300 group-hover:translate-x-0.5"
          />
        </button>
      </div>

      {/* Stat tiles */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statTiles({ targets, moon, conditions }).map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5 transition-colors duration-300 hover:border-white/10"
          >
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#6B7280]">
              {stat.label}
            </p>
            <p className="mt-0.5 text-xl font-bold text-white">
              <CountUp
                value={stat.value}
                suffix={stat.suffix || ""}
                decimals={stat.decimals || 0}
              />
            </p>
          </div>
        ))}
      </div>

      {/* Top five targets */}
      <div className="mt-5 flex-1">
        {isLoading ? (
          <Skeleton />
        ) : isError ? (
          <p className="rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 px-4 py-3 text-sm text-[#EF4444]">
            Couldn't reach the Astro Engine — tonight's ranking is unavailable.
          </p>
        ) : targets.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[#AAB4C5]">
            Nothing above your horizon right now — the sky turns; check back
            after dusk.
          </p>
        ) : (
          <div className="space-y-2">
            {targets.slice(0, 5).map((target) => (
              <TargetRow
                key={target.catalog_id}
                target={target}
                onOpen={() => navigate(`/tonight/${target.catalog_id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Field notes — dynamic guidance */}
      {notes.length > 0 && (
        <div className="mt-5 border-t border-white/10 pt-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#6B7280]">
            Field notes
          </p>
          <ul className="mt-2 space-y-1.5">
            {notes.map((note) => (
              <li
                key={note}
                className="flex gap-2 text-xs leading-relaxed text-[#AAB4C5]"
              >
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#FF8C1A]" />
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}
    </SpotlightCard>
  );
}
