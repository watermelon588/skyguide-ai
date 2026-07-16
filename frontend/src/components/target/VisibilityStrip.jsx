import SpotlightCard from "../tonight/fx/SpotlightCard";
import {
  compassPoint,
  formatDegrees,
  formatHourAngle,
} from "../tonight/vocabulary";
import { useRecommendations } from "../../hooks/useRecommendations";

/**
 * "Can I see it, and for how long?" — the live-geometry band of the Target
 * Panel. Visible objects get the full readout (position, airmass, moon
 * separation, the observing window); below-horizon objects get an honest
 * "not now" with their best season.
 */

function Cell({ label, value, hint }) {
  return (
    <div className="border border-line bg-surface-3 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.2em] text-ink-3">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-ink">
        {value}
      </p>
      {hint && <p className="text-[11px] text-ink-3">{hint}</p>}
    </div>
  );
}

/** The headline sentence for the observing window. */
function windowLine(target) {
  if (!target.visible) return null;
  if (target.circumpolar) {
    return "Circumpolar from your latitude — it never sets. Observe at leisure.";
  }
  if (target.set && target.hours_until_set != null) {
    const urgency =
      target.hours_until_set < 2
        ? " — catch it soon."
        : target.hours_until_set < 4
          ? " — a comfortable window."
          : ".";
    return `Above your horizon for ${target.hours_until_set} more hours (sets ${target.set})${urgency}`;
  }
  return "Above your horizon right now.";
}

/**
 * "Best time tonight" — the recommendation engine's darkness-aware window
 * (up-time ∩ astronomical night, peaking at transit). React Query dedupes
 * this against the dashboard's own recommendations fetch; a target outside
 * the recommendation list (or the engine being down) just renders nothing.
 */
function BestTimeLine({ catalogId }) {
  const recs = useRecommendations({ limit: 20 });
  const match = recs.objects.find((o) => o.catalog_id === catalogId);
  const w = match?.best_window;
  if (!w) return null;

  return (
    <p className="mt-1 text-sm text-ink-2">
      Best time tonight:{" "}
      <span className="font-semibold tabular-nums text-ink">
        {w.start}–{w.end}
      </span>
      {w.peak && (
        <>
          {" "}
          — highest at <span className="font-semibold tabular-nums text-ink">{w.peak}</span>
          {w.peak_altitude_deg != null && ` (${Math.round(w.peak_altitude_deg)}° up)`}
        </>
      )}
      .
    </p>
  );
}

export default function VisibilityStrip({ target }) {
  if (!target.visible) {
    return (
      <SpotlightCard className="p-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-ink-3">
          Visibility
        </p>
        <p className="mt-2 font-semibold text-ink">
          Below your horizon right now.
        </p>
        <p className="mt-1 text-sm text-ink-2">
          {target.season
            ? `Best season from your sky: ${target.season}.`
            : "Check back later tonight — the sky turns."}
        </p>
      </SpotlightCard>
    );
  }

  const cells = [
    {
      label: "Altitude",
      value: formatDegrees(target.altitude_deg),
      hint: "higher is steadier",
    },
    {
      label: "Direction",
      value: compassPoint(target.azimuth_deg),
      hint: formatDegrees(target.azimuth_deg, 0),
    },
    {
      label: "Airmass",
      value: target.airmass != null ? target.airmass.toFixed(2) : "—",
      hint: "1.0 = zenith",
    },
    {
      label: "Moon separation",
      value:
        target.moon_separation_deg != null
          ? formatDegrees(target.moon_separation_deg, 0)
          : "—",
      hint:
        target.moon_penalty > 0.05 ? "moonlight is a factor" : "moon-safe",
    },
    {
      label: "Meridian",
      value: formatHourAngle(target.hour_angle_hours),
      hint: target.transit ? `transits ${target.transit}` : null,
    },
    {
      label: "Sets",
      value: target.circumpolar ? "never" : (target.set ?? "—"),
      hint: target.circumpolar
        ? "circumpolar"
        : target.hours_until_set != null
          ? `in ${target.hours_until_set} h`
          : null,
    },
  ];

  return (
    <SpotlightCard className="p-6">
      <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-accent">
        Visibility · live for your coordinates
      </p>
      <p className="mt-2 font-medium text-ink">{windowLine(target)}</p>
      <BestTimeLine catalogId={target.catalog_id} />
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cells.map((cell) => (
          <Cell key={cell.label} {...cell} />
        ))}
      </div>
    </SpotlightCard>
  );
}
