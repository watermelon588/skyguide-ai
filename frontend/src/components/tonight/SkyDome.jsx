import { useMemo, useState } from "react";

import SpotlightCard from "./fx/SpotlightCard";
import {
  compassPoint,
  formatDegrees,
  scoreColor,
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

export default function SkyDome({ targets, moon, onSelect }) {
  const [hovered, setHovered] = useState(null);

  const plotted = useMemo(
    () =>
      targets.map((t) => ({
        ...t,
        ...project(t.altitude_deg, t.azimuth_deg),
      })),
    [targets],
  );

  const moonPos =
    moon?.above_horizon && moon.altitude_deg != null
      ? project(moon.altitude_deg, moon.azimuth_deg)
      : null;

  const active = hovered
    ? plotted.find((p) => p.catalog_id === hovered)
    : null;

  return (
    <section data-reveal className="mx-auto w-full max-w-7xl px-6 sm:px-12">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-[#FF8C1A]">
            All-Sky Chart
          </p>
          <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
            Your dome, right now
          </h2>
        </div>
        <p className="hidden max-w-xs text-right text-xs text-[#6B7280] sm:block">
          Zenith at center, horizon at the rim. Azimuth runs N → E → S → W.
          Click any object for the full dossier.
        </p>
      </div>

      <SpotlightCard className="p-4 sm:p-8">
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
                  fill="#6B7280"
                  fontSize="8"
                >
                  {label}
                </text>
              </g>
            ))}
            {/* Crosshair + zenith */}
            <line x1={-R} y1="0" x2={R} y2="0" stroke="rgba(255,255,255,0.05)" />
            <line x1="0" y1={-R} x2="0" y2={R} stroke="rgba(255,255,255,0.05)" />
            <circle cx="0" cy="0" r="1.5" fill="#6B7280" />

            {/* Cardinal labels */}
            {CARDINALS.map(({ az, label }) => {
              const { x, y } = project(-8, az); // just outside the rim
              return (
                <text
                  key={label}
                  x={x}
                  y={y + 3}
                  textAnchor="middle"
                  fill={label === "N" ? "#FF8C1A" : "#AAB4C5"}
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
                  fill="#AAB4C5"
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
                    stroke="#FF8C1A"
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
            <div className="min-h-[120px] rounded-2xl border border-white/10 bg-white/5 p-5">
              {active ? (
                <>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#FF8C1A]">
                    {active.catalog_id} · {typeMeta(active.object_type).label}
                  </p>
                  <p className="mt-1 truncate text-xl font-semibold text-white">
                    {active.name || active.catalog_id}
                  </p>
                  <p className="mt-2 text-sm text-[#AAB4C5]">
                    Alt {formatDegrees(active.altitude_deg)} · Az{" "}
                    {formatDegrees(active.azimuth_deg)} (
                    {compassPoint(active.azimuth_deg)}) · Score{" "}
                    <span className="font-semibold text-white">
                      {active.visibility_score}
                    </span>
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#6B7280]">
                    Readout
                  </p>
                  <p className="mt-2 text-sm text-[#AAB4C5]">
                    Hover a point to identify it. Larger, warmer dots are
                    tonight's strongest targets.
                  </p>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-[#AAB4C5]">
              {Object.entries(TYPE_META)
                .filter(([key]) => key !== "other")
                .map(([key, meta]) => (
                  <span key={key} className="flex items-center gap-2">
                    <span className="text-base leading-none text-[#FB923C]">
                      {meta.symbol}
                    </span>
                    {meta.label}
                  </span>
                ))}
            </div>

            <p className="text-xs leading-relaxed text-[#6B7280]">
              {plotted.length} objects plotted from live geometry — altitude,
              azimuth and score recomputed by the Astro Engine for your exact
              coordinates and this exact moment.
            </p>
          </div>
        </div>
      </SpotlightCard>
    </section>
  );
}
