import { memo } from "react";

/**
 * A single current-conditions cell: icon + label + value inside a glass tile.
 * Memoized because the popover renders six of these and their props are stable
 * once weather has loaded.
 *
 * @param {{ icon: React.ReactNode, label: string, value: string }} props
 */
function WeatherMetric({ icon, label, value }) {
  return (
    <div className="flex items-center gap-2.5 border border-line bg-surface-3 px-2.5 py-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-surface-2 text-accent">
        {icon}
      </span>
      <div className="min-w-0 leading-tight">
        <p className="text-[10px] uppercase tracking-wide text-ink-3">
          {label}
        </p>
        <p className="truncate text-sm font-semibold text-ink">{value}</p>
      </div>
    </div>
  );
}

export default memo(WeatherMetric);
