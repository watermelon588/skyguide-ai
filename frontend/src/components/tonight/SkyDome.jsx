import { useMemo, useState } from "react";

import SpotlightCard from "./fx/SpotlightCard";
import {
  compassPoint,
  formatDegrees,
  scoreColor,
  typeKey,
  typeMeta,
  TYPE_META,
} from "./vocabulary";

/**
 * Interactive all-sky chart (polar alt-az projection).
 *
 * The zenith is the center; the horizon is the outer ring. Azimuth runs
 * clockwise from North at the top — exactly what you'd see lying back under
 * the sky with your feet pointing south. Every visible object is plotted;
 * score drives dot size/tone, type drives the glyph in the legend. Hovering
 * reads out the object; clicking hands it to the detail drawer.
 *
 * Pure SVG + React state — no chart library, per the design system.
 */

const R = 150; // horizon radius in viewBox units
const RINGS = [
  { alt: 0, label: "Horizon" },
  { alt: 30, label: "30°" },
  { alt: 60, label: "60°" },
];
const CARDINALS = [
  { az: 0, label: "N" },
  { az: 90, label: "E" },
  { az: 180, label: "S" },
  { az: 270, label: "W" },
];

/** alt/az -> SVG x,y. Azimuth 0 = North (up), clockwise. */
function project(altitudeDeg, azimuthDeg) {
  const r = ((90 - altitudeDeg) / 90) * R;
  const theta = (azimuthDeg * Math.PI) / 180;
  return { x: r * Math.sin(theta), y: -r * Math.cos(theta) };
}

function dotRadius(score) {
  if (score == null) return 2;
  return 2 + (score / 100) * 4.5;
}

export default function SkyDome({ targets, moon, onSelect, compact = false }) {
  const [hovered, setHovered] = useState(null);
  // Type filter — "all", or a typeKey. Local preference, resets per visit.
  const [typeFilter, setTypeFilter] = useState("all");

  const plotted = useMemo(
    () =>
      targets
        .filter(
          (t) => typeFilter === "all" || typeKey(t.object_type) === typeFilter,
        )
        .map((t) => ({
          ...t,
          ...project(t.altitude_deg, t.azimuth_deg),
        })),
    [targets, typeFilter],
  );

  const moonPos =
    moon?.above_horizon && moon.altitude_deg != null
      ? project(moon.altitude_deg, moon.azimuth_deg)
      : null;

  const active = hovered
    ? plotted.find((p) => p.catalog_id === hovered)
    : null;

  // Compact mode (dashboard grid cell) renders just the chart card with a
  // slim identity row; the full mode keeps its /tonight section header.
  const card = (
    <SpotlightCard className={compact ? "h-full p-4 sm:p-6" : "p-4 sm:p-8"}>
      {compact && (
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-accent">
            All-Sky Chart
          </p>
          <p className="truncate text-xs text-ink-3">
            zenith at center · horizon at the rim
          </p>
        </div>
      )}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
          <svg
            viewBox="-170 -170 340 340"
            className="mx-auto w-full max-w-[560px]"
            role="img"
            aria-label="Sky chart of currently visible objects"
          >
            {/* Altitude rings */}
            {RINGS.map(({ alt, label }) => (
              <g key={alt}>
                <circle
                  cx="0"
                  cy="0"
                  r={((90 - alt) / 90) * R}
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="1"
                  strokeDasharray={alt === 0 ? "none" : "3 5"}
                />
                <text
                  x="4"
                  y={-((90 - alt) / 90) * R + 12}
                  fill="#6B6C70"
                  fontSize="8"
                >
                  {label}
                </text>
              </g>
            ))}
            {/* Crosshair + zenith */}
            <line x1={-R} y1="0" x2={R} y2="0" stroke="rgba(255,255,255,0.05)" />
            <line x1="0" y1={-R} x2="0" y2={R} stroke="rgba(255,255,255,0.05)" />
            <circle cx="0" cy="0" r="1.5" fill="#6B6C70" />

            {/* Cardinal labels */}
            {CARDINALS.map(({ az, label }) => {
              const { x, y } = project(-8, az); // just outside the rim
              return (
                <text
                  key={label}
                  x={x}
                  y={y + 3}
                  textAnchor="middle"
                  fill={label === "N" ? "#1E63FF" : "#DADADA"}
                  fontSize="11"
                  fontWeight="600"
                >
                  {label}
                </text>
              );
            })}

            {/* The Moon */}
            {moonPos && (
              <g>
                <circle
                  cx={moonPos.x}
                  cy={moonPos.y}
                  r="7"
                  fill="rgba(255,255,255,0.85)"
                />
                <circle
                  cx={moonPos.x}
                  cy={moonPos.y}
                  r="11"
                  fill="none"
                  stroke="rgba(255,255,255,0.25)"
                  strokeWidth="1"
                />
                <text
                  x={moonPos.x}
                  y={moonPos.y - 15}
                  textAnchor="middle"
                  fill="#DADADA"
                  fontSize="8"
                >
                  Moon
                </text>
              </g>
            )}

            {/* Objects — faint halo for the hovered one */}
            {plotted.map((p) => (
              <g
                key={p.catalog_id}
                className="cursor-pointer"
                onPointerEnter={() => setHovered(p.catalog_id)}
                onPointerLeave={() => setHovered(null)}
                onClick={() => onSelect?.(p.catalog_id)}
              >
                {hovered === p.catalog_id && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={dotRadius(p.visibility_score) + 6}
                    fill="none"
                    stroke="#0049CD"
                    strokeWidth="1"
                    opacity="0.6"
                  />
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={dotRadius(p.visibility_score)}
                  fill={scoreColor(p.visibility_score)}
                  opacity={hovered && hovered !== p.catalog_id ? 0.35 : 0.9}
                  style={{ transition: "opacity 0.25s" }}
                />
              </g>
            ))}
          </svg>

          {/* Readout / legend column */}
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="min-h-[120px] border border-line bg-surface-3 p-5">
              {active ? (
                <>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-accent">
                    {active.catalog_id} · {typeMeta(active.object_type).label}
                  </p>
                  <p className="mt-1 truncate text-xl font-semibold text-ink">
                    {active.name || active.catalog_id}
                  </p>
                  <p className="mt-2 text-sm text-ink-2">
                    Alt {formatDegrees(active.altitude_deg)} · Az{" "}
                    {formatDegrees(active.azimuth_deg)} (
                    {compassPoint(active.azimuth_deg)}) · Score{" "}
                    <span className="font-semibold text-ink">
                      {active.visibility_score}
                    </span>
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-ink-3">
                    Readout
                  </p>
                  <p className="mt-2 text-sm text-ink-2">
                    Hover a point to identify it. Larger, warmer dots are
                    tonight's strongest targets.
                  </p>
                </>
              )}
            </div>

            {/* Legend doubles as the type filter — tap to isolate a family. */}
            <div className="flex flex-wrap gap-1.5">
              {[["all", { symbol: "✳", label: "All types" }]]
                .concat(
                  Object.entries(TYPE_META).filter(([key]) => key !== "other"),
                )
                .map(([key, meta]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTypeFilter(key)}
                    aria-pressed={typeFilter === key}
                    className={`flex items-center gap-1.5 border px-2.5 py-1 text-xs transition-colors duration-300 ${
                      typeFilter === key
                        ? "border-accent/50 bg-accent/15 text-accent"
                        : "border-line bg-surface-2 text-ink-2 hover:bg-surface-3"
                    }`}
                  >
                    <span className="text-sm leading-none">{meta.symbol}</span>
                    {meta.label}
                  </button>
                ))}
            </div>

            <p className="text-xs leading-relaxed text-ink-3">
              {plotted.length} objects plotted from live geometry — altitude,
              azimuth and score recomputed by the Astro Engine for your exact
              coordinates and this exact moment.
            </p>
          </div>
        </div>
    </SpotlightCard>
  );

  if (compact) return card;

  return (
    <section data-reveal className="mx-auto w-full max-w-7xl px-6 sm:px-12">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-accent">
            All-Sky Chart
          </p>
          <h2 className="mt-2 text-3xl font-bold text-ink sm:text-4xl">
            Your dome, right now
          </h2>
        </div>
        <p className="hidden max-w-xs text-right text-xs text-ink-3 sm:block">
          Zenith at center, horizon at the rim. Azimuth runs N → E → S → W.
          Click any object for the full dossier.
        </p>
      </div>
      {card}
    </section>
  );
}
