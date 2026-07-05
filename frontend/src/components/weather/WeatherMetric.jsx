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
    <div className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/5 text-orange-400">
        {icon}
      </span>
      <div className="min-w-0 leading-tight">
        <p className="text-[10px] uppercase tracking-wide text-[#6B7280]">
          {label}
        </p>
        <p className="truncate text-sm font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}

export default memo(WeatherMetric);
