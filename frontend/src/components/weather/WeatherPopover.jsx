import { useEffect, useMemo, useState } from "react";
import { animate } from "framer-motion";
import {
  FiThermometer,
  FiCloud,
  FiDroplet,
  FiWind,
  FiEye,
  FiAlertTriangle,
  FiRefreshCw,
} from "react-icons/fi";
import { TbGauge } from "react-icons/tb";
import { formatMetric, qualityStyle } from "../../utils/weather";
import WeatherMetric from "./WeatherMetric";
import WeatherQualityBadge from "./WeatherQualityBadge";
import WeatherSkeleton from "./WeatherSkeleton";

const ICON = "text-base";

/** Count-up for the observing score (React Bits "Number Counter" equivalent). */
function AnimatedScore({ score, colorClass }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(0, score, {
      duration: 0.6,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [score]);

  return (
    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full border border-line bg-surface-2">
      <span className={`text-lg font-bold leading-none tabular-nums ${colorClass}`}>
        {display}
      </span>
      <span className="text-[9px] uppercase tracking-wide text-ink-3">
        score
      </span>
    </div>
  );
}

/** Reserved astronomy metric (future sessions) — shows "Coming Soon". */
function ReservedStat({ label }) {
  return (
    <div className="flex flex-col items-center gap-1 border border-line bg-surface-3 px-2 py-2 text-center">
      <span className="text-[10px] uppercase tracking-wide text-ink-3">
        {label}
      </span>
      <span className="text-[10px] font-medium text-ink-2">Coming Soon</span>
    </div>
  );
}

/**
 * Popover body: current conditions grid, then the observing assessment.
 * Handles its own loading (skeleton) and error (inline retry) states so the
 * button stays a thin trigger.
 *
 * @param {{ data:object, isLoading:boolean, isError:boolean, onRetry:()=>void }} props
 */
export default function WeatherPopover({ data, isLoading, isError, onRetry }) {
  const weather = data?.weather;
  const conditions = data?.observing_conditions;

  const metrics = useMemo(() => {
    if (!weather) return [];
    return [
      {
        key: "temp",
        icon: <FiThermometer className={ICON} />,
        label: "Temperature",
        value: formatMetric(weather.temperature_c, "°C"),
      },
      {
        key: "cloud",
        icon: <FiCloud className={ICON} />,
        label: "Cloud Cover",
        value: formatMetric(weather.cloud_cover_percent, "%"),
      },
      {
        key: "humidity",
        icon: <FiDroplet className={ICON} />,
        label: "Humidity",
        value: formatMetric(weather.humidity_percent, "%"),
      },
      {
        key: "wind",
        icon: <FiWind className={ICON} />,
        label: "Wind",
        value: formatMetric(weather.wind_speed_kmh, " km/h"),
      },
      {
        key: "visibility",
        icon: <FiEye className={ICON} />,
        label: "Visibility",
        value: formatMetric(weather.visibility_km, " km", 1),
      },
      {
        key: "pressure",
        icon: <TbGauge className={ICON} />,
        label: "Pressure",
        value: formatMetric(weather.pressure_hpa, " hPa"),
      },
    ];
  }, [weather]);

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <FiAlertTriangle className="text-2xl text-warning" />
        <p className="text-sm text-ink-2">Unable to load weather.</p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 border border-line bg-surface-2 px-3.5 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-surface-3"
        >
          <FiRefreshCw className="text-sm" />
          Retry
        </button>
      </div>
    );
  }

  if (isLoading || !conditions) {
    return <WeatherSkeleton />;
  }

  const quality = conditions.observing_quality;
  const scoreColor = qualityStyle(quality).text;

  return (
    <div className="space-y-4">
      {/* Current conditions */}
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-3">
          Current Conditions
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map((m) => (
            <WeatherMetric
              key={m.key}
              icon={m.icon}
              label={m.label}
              value={m.value}
            />
          ))}
        </div>
      </div>

      <div className="h-px w-full bg-line" />

      {/* Observing conditions */}
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-3">
          Observing Conditions
        </p>
        <div className="flex items-center gap-3">
          <AnimatedScore
            score={conditions.observing_score}
            colorClass={scoreColor}
          />
          <div className="min-w-0 space-y-1.5">
            <WeatherQualityBadge quality={quality} />
            <p className="text-xs leading-snug text-ink-2">
              {conditions.recommendation}
            </p>
          </div>
        </div>

        {/* Reserved — populated in a future session without a redesign. */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <ReservedStat label="Seeing" />
          <ReservedStat label="Transparency" />
          <ReservedStat label="Moon" />
        </div>
      </div>
    </div>
  );
}
