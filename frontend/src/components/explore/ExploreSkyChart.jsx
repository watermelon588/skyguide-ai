import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { Card } from "../ui/card";
import { useTonight } from "../../hooks/useTonight";
import {
  typeKey,
  typeMeta,
  TYPE_META,
  formatDegrees,
  compassPoint,
} from "../tonight/vocabulary";

/**
 * Explore's all-sky chart — the observer's live dome (zenith at center, horizon
 * at the rim), plotting everything up right now.
 *
 * Deliberately NOT the /tonight dome's look. There, every dot is a score-tinted
 * blue circle — informative for "what's best" but visually flat ("only blue
 * dots"). Here the job is to give SHAPE to a big catalog, so each object is drawn
 * as its TYPE GLYPH (galaxy ◍, nebula ❋, cluster ∴ …) and SIZED by brightness.
 * That keeps the single-hue rule (types are shape, not colour — see
 * vocabulary.js) while making type and magnitude legible at a glance, and the
 * legend doubles as a filter so you can isolate one family.
 */

const R = 150;
const RINGS = [
  { alt: 0, dash: "none" },
  { alt: 30, dash: "3 5" },
  { alt: 60, dash: "3 5" },
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

/** Brighter objects render larger. Magnitude ~ -1 (bright) .. 13 (faint). */
function glyphSize(magnitude) {
  if (magnitude == null) return 9;
  // 3 mag -> 15px down to 12 mag -> 7px, clamped.
  return Math.max(7, Math.min(16, 17 - magnitude));
}

export default function ExploreSkyChart() {
  const { targets, moon, located, isLoading } = useTonight();
  const [typeFilter, setTypeFilter] = useState("all");
  const [hovered, setHovered] = useState(null);

  const plotted = useMemo(
    () =>
      (targets ?? [])
        .filter(
          (t) =>
            t.altitude_deg != null &&
            t.azimuth_deg != null &&
            (typeFilter === "all" || typeKey(t.object_type) === typeFilter),
        )
        .map((t) => ({ ...t, ...project(t.altitude_deg, t.azimuth_deg) })),
    [targets, typeFilter],
  );

  const moonPos =
    moon?.above_horizon && moon.altitude_deg != null
      ? project(moon.altitude_deg, moon.azimuth_deg)
      : null;

  const active = hovered ? plotted.find((p) => p.catalog_id === hovered) : null;

  if (!located) {
    return (
      <Card className="border-line bg-surface-2 p-8 text-center">
        <h3 className="text-sm font-semibold text-ink">All-Sky Chart</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink-3">
          Set your observing location to plot the catalog against your live sky —
          zenith at center, horizon at the rim.
        </p>
        <Link
          to="/dashboard"
          className="mt-4 inline-block bg-accent px-5 py-2 text-sm font-semibold text-ink transition-colors hover:bg-accent-hi"
        >
          Set location
        </Link>
      </Card>
    );
  }

  return (
    <Card className="border-line bg-surface-2 p-5">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-ink">All-Sky Chart</h3>
          <p className="mt-0.5 text-xs text-ink-3">
            Your live dome · zenith at center · horizon at the rim · sized by
            brightness
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
        <svg
          viewBox="-170 -170 340 340"
          className="mx-auto w-full max-w-[520px]"
          role="img"
          aria-label="All-sky chart of currently visible catalog objects"
        >
          {RINGS.map(({ alt, dash }) => (
            <circle
              key={alt}
              cx="0"
              cy="0"
              r={((90 - alt) / 90) * R}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
              strokeDasharray={dash}
            />
          ))}
          <line x1={-R} y1="0" x2={R} y2="0" stroke="rgba(255,255,255,0.05)" />
          <line x1="0" y1={-R} x2="0" y2={R} stroke="rgba(255,255,255,0.05)" />
          <circle cx="0" cy="0" r="1.5" fill="#6B6C70" />

          {CARDINALS.map(({ az, label }) => {
            const { x, y } = project(-8, az);
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

          {moonPos && (
            <circle cx={moonPos.x} cy={moonPos.y} r="6" fill="rgba(255,255,255,0.85)" />
          )}

          {/* Objects as type glyphs, sized by brightness. */}
          {plotted.map((p) => {
            const dim = hovered && hovered !== p.catalog_id;
            return (
              <text
                key={p.catalog_id}
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={glyphSize(p.magnitude)}
                fill={hovered === p.catalog_id ? "#1E63FF" : "#DADADA"}
                opacity={dim ? 0.3 : 0.92}
                style={{ transition: "opacity 0.2s", cursor: "pointer" }}
                onPointerEnter={() => setHovered(p.catalog_id)}
                onPointerLeave={() => setHovered(null)}
              >
                {typeMeta(p.object_type).symbol}
              </text>
            );
          })}
        </svg>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="min-h-[110px] border border-line bg-surface-3 p-5">
            {active ? (
              <>
                <p className="text-[11px] uppercase tracking-[0.2em] text-accent">
                  {active.catalog_id} · {typeMeta(active.object_type).label}
                </p>
                <Link
                  to={`/tonight/${encodeURIComponent(active.catalog_id)}`}
                  className="mt-1 block truncate text-xl font-semibold text-ink transition-colors hover:text-accent"
                >
                  {active.name || active.catalog_id}
                </Link>
                <p className="mt-2 text-sm text-ink-2">
                  Alt {formatDegrees(active.altitude_deg)} · Az{" "}
                  {formatDegrees(active.azimuth_deg)} ({compassPoint(active.azimuth_deg)})
                  {active.magnitude != null && ` · mag ${active.magnitude}`}
                </p>
              </>
            ) : (
              <>
                <p className="text-[11px] uppercase tracking-[0.2em] text-ink-3">
                  Readout
                </p>
                <p className="mt-2 text-sm text-ink-2">
                  Each glyph is an object's type; larger glyphs are brighter.
                  Hover to identify, click the name to open its panel.
                </p>
              </>
            )}
          </div>

          {/* Legend + filter. */}
          <div className="flex flex-wrap gap-1.5">
            {[["all", { symbol: "✳", label: "All types" }]]
              .concat(Object.entries(TYPE_META).filter(([key]) => key !== "other"))
              .map(([key, meta]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTypeFilter(key)}
                  aria-pressed={typeFilter === key}
                  className={`flex items-center gap-1.5 border px-2.5 py-1 text-xs transition-colors ${
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
            {isLoading
              ? "Computing your sky…"
              : `${plotted.length} objects up now, from live geometry for your exact coordinates.`}
          </p>
        </div>
      </div>
    </Card>
  );
}
