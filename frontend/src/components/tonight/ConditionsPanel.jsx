import SpotlightCard from "./fx/SpotlightCard";
import CountUp from "./fx/CountUp";

/**
 * Atmospheric report — the Astro Engine's observing-conditions scoring
 * rendered as a headline dial plus per-factor meter rows. All judgment
 * (ratings, recommendation copy) comes from the engine; this only displays.
 */

function MeterRow({ label, valueLabel, fraction, rating }) {
  const pct = Math.max(0, Math.min(1, fraction ?? 0)) * 100;
  return (
    <div className="border-b border-white/5 pb-3">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-[#6B7280]">{label}</span>
        <span className="font-medium tabular-nums text-white">
          {valueLabel}
          {rating && (
            <span className="ml-2 text-xs font-normal text-[#AAB4C5]">
              {rating}
            </span>
          )}
        </span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#FF6B00] to-[#FF8C1A] transition-[width] duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function ConditionsPanel({ weather, conditions }) {
  if (!conditions) return null;

  // A missing measurement renders as a plain "—" with an empty meter,
  // never as "—%" — sensors can be offline without the panel looking broken.
  const withUnit = (value, unit) => (value == null ? "—" : `${value}${unit}`);
  const rows = [
    {
      label: "Cloud cover",
      valueLabel: withUnit(conditions.cloud_cover_percent, "%"),
      fraction:
        conditions.cloud_cover_percent == null
          ? 0
          : 1 - conditions.cloud_cover_percent / 100,
      rating: conditions.cloud_rating,
    },
    {
      label: "Humidity",
      valueLabel: withUnit(conditions.humidity_percent, "%"),
      fraction:
        conditions.humidity_percent == null
          ? 0
          : 1 - conditions.humidity_percent / 100,
      rating: conditions.humidity_rating,
    },
    {
      label: "Wind",
      valueLabel: withUnit(conditions.wind_speed_kmh, " km/h"),
      fraction:
        conditions.wind_speed_kmh == null
          ? 0
          : 1 - Math.min(conditions.wind_speed_kmh, 50) / 50,
      rating: conditions.wind_rating,
    },
    {
      label: "Visibility",
      valueLabel: withUnit(conditions.visibility_km, " km"),
      fraction:
        conditions.visibility_km == null
          ? 0
          : Math.min(conditions.visibility_km, 10) / 10,
      rating: null,
    },
  ];

  const verdicts = [
    ["Seeing", conditions.seeing],
    ["Transparency", conditions.transparency],
    ["Bortle class", conditions.bortle_class],
    ["Weather", weather?.weather_main ?? conditions.weather_main],
  ].filter(([, v]) => v != null);

  return (
    <SpotlightCard data-reveal className="flex h-full flex-col p-7">
      <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-[#FF8C1A]">
        Observing Conditions
      </p>

      <div className="mt-5 flex items-center gap-5">
        <p className="text-6xl font-bold text-white">
          <CountUp value={conditions.observing_score} />
          <span className="text-xl font-medium text-[#6B7280]">/100</span>
        </p>
        <div>
          <p className="text-lg font-semibold text-white">
            {conditions.observing_quality || "—"}
          </p>
          <p className="text-xs text-[#AAB4C5]">engine-scored sky quality</p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {rows.map((row) => (
          <MeterRow key={row.label} {...row} />
        ))}
      </div>

      {verdicts.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {verdicts.map(([label, value]) => (
            <span
              key={label}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-[#AAB4C5]"
            >
              {label}: <span className="font-medium text-white">{value}</span>
            </span>
          ))}
        </div>
      )}

      {conditions.recommendation && (
        <p className="mt-auto pt-4 text-sm italic leading-relaxed text-[#AAB4C5]">
          “{conditions.recommendation}”
        </p>
      )}
    </SpotlightCard>
  );
}
