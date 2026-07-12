import SpotlightCard from "./fx/SpotlightCard";
import { compassPoint, formatDegrees } from "./vocabulary";

/**
 * Lunar dossier — an SVG phase disc rendered from live illumination data,
 * flanked by the numbers an observer actually plans around (rise/set, age,
 * distance, angular size).
 *
 * Phase disc technique: full lit circle, dark overlay whose inner edge (the
 * terminator) is a half-ellipse with rx driven by illumination. Waxing vs
 * waning flips which limb stays lit.
 */

function MoonDisc({ illumination, phase, size = 150 }) {
  const r = size / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;
  const frac = Math.max(0, Math.min(100, illumination ?? 0)) / 100;
  const waning = (phase || "").toLowerCase().includes("waning");
  // Terminator ellipse x-radius: +r at full, -r at new (sweeps across).
  const rx = r * (2 * frac - 1);

  // Dark region = lune between the limb semicircle and the terminator arc.
  // Waxing: dark on the left (west limb); waning: dark on the right.
  const limbSweep = waning ? 1 : 0;
  const termSweep = rx >= 0 ? (waning ? 0 : 1) : (waning ? 1 : 0);
  const darkPath = [
    `M ${cx} ${cy - r}`,
    `A ${r} ${r} 0 0 ${limbSweep} ${cx} ${cy + r}`,
    `A ${Math.abs(rx)} ${r} 0 0 ${termSweep} ${cx} ${cy - r}`,
    "Z",
  ].join(" ");

  return (
    <svg
      width={size}
      height={size}
      role="img"
      aria-label={`Moon: ${phase}, ${illumination}% illuminated`}
    >
      <defs>
        <radialGradient id="moon-lit" cx="42%" cy="40%" r="72%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="75%" stopColor="#C9CFDA" />
          <stop offset="100%" stopColor="#9AA3B2" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r + 3} fill="none" stroke="rgba(255,255,255,0.1)" />
      <circle cx={cx} cy={cy} r={r} fill="url(#moon-lit)" />
      <path d={darkPath} fill="#0B0F16" fillOpacity="0.94" />
    </svg>
  );
}

export default function MoonPanel({ moon }) {
  if (!moon) return null;

  const targetScore = moon.reserved?.lunar_target_score ?? null;
  const supermoon = moon.reserved?.supermoon === true;

  const rows = [
    ["Phase", moon.phase],
    ["Age", `${moon.age_days} days`],
    ["Moonrise", moon.moonrise ?? "—"],
    ["Moonset", moon.moonset ?? "—"],
    ["Distance", `${Math.round(moon.distance_km).toLocaleString()} km`],
    ["Angular size", `${moon.angular_diameter_arcmin}′`],
    [
      "Position",
      moon.above_horizon
        ? `Alt ${formatDegrees(moon.altitude_deg)} · ${compassPoint(moon.azimuth_deg)}`
        : "Below horizon",
    ],
  ];
  if (targetScore != null) {
    // Terminator relief peaks at the quarters — this is "how rewarding is
    // the Moon itself in the eyepiece right now", straight from the engine.
    rows.push(["Telescope target", `${Math.round(targetScore)}/100`]);
  }

  return (
    <SpotlightCard data-reveal className="flex h-full flex-col p-7">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-[#FF8C1A]">
          The Moon
        </p>
        {supermoon && (
          <span className="shrink-0 rounded-lg border border-[#FF8C1A]/40 bg-[#FF8C1A]/10 px-2.5 py-1 text-[11px] font-semibold text-[#FF8C1A]">
            Supermoon
          </span>
        )}
      </div>
      <div className="mt-5 flex flex-1 items-center gap-7">
        <MoonDisc illumination={moon.illumination} phase={moon.phase} />
        <div className="min-w-0 flex-1">
          <p className="text-3xl font-bold text-white">
            {moon.illumination}
            <span className="text-lg text-[#AAB4C5]">%</span>
          </p>
          <p className="text-sm text-[#AAB4C5]">illuminated · {moon.phase}</p>
          <dl className="mt-4 space-y-1.5">
            {rows.map(([label, value]) => (
              <div
                key={label}
                className="flex items-baseline justify-between gap-4 border-b border-white/5 pb-1.5 text-sm"
              >
                <dt className="shrink-0 text-[#6B7280]">{label}</dt>
                <dd className="truncate text-right font-medium tabular-nums text-white">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-[#6B7280]">
        {moon.above_horizon
          ? "The Moon is up — bright targets tolerate it, faint nebulae and galaxies prefer it below the horizon."
          : "The Moon is below your horizon — prime time for faint deep-sky objects."}
      </p>
    </SpotlightCard>
  );
}
