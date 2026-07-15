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
    <div className="border-b border-line pb-3">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-ink-3">{label}</span>
        <span className="font-medium tabular-nums text-ink">
          {valueLabel}
          {rating && (
            <span className="ml-2 text-xs font-normal text-ink-2">
              {rating}
            </span>
          )}
        </span>
      </div>
      <div className="mt-2 h-1 overflow-hidden bg-surface-3">
        <div
          className="h-full bg-gradient-to-r from-accent to-accent-hi transition-[width] duration-700"
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
      <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-accent">
        Observing Conditions
      </p>

      <div className="mt-5 flex items-center gap-5">
        <p className="text-6xl font-black tabular-nums text-ink">
          <CountUp value={conditions.observing_score} />
          <span className="text-xl font-medium text-ink-3">/100</span>
        </p>
        <div>
          <p className="text-lg font-semibold text-ink">
            {conditions.observing_quality || "—"}
          </p>
          <p className="text-xs text-ink-2">engine-scored sky quality</p>
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
              className="border border-line bg-surface-2 px-3 py-1.5 text-xs text-ink-2"
            >
              {label}: <span className="font-medium text-ink">{value}</span>
            </span>
          ))}
        </div>
      )}

      {conditions.recommendation && (
        <p className="mt-auto pt-4 text-sm italic leading-relaxed text-ink-2">
          “{conditions.recommendation}”
        </p>
      )}
    </SpotlightCard>
  );
}
