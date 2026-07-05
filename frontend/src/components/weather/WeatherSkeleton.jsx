/**
 * Shimmer placeholder shown while the weather query is in flight.
 * Mirrors the popover's structure (metric grid + observing block) so the
 * layout doesn't jump when real data arrives. No spinner, per spec.
 *
 * The shimmer uses Tailwind's built-in `animate-pulse` — the one place a CSS
 * keyframe is acceptable, since Framer Motion is a poor fit for looping
 * skeleton shimmer.
 */
function Bar({ className = "" }) {
  return <div className={`rounded-md bg-white/10 ${className}`} />;
}

export default function WeatherSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-hidden="true">
      {/* Metric grid */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-2"
          >
            <div className="h-7 w-7 shrink-0 rounded-md bg-white/10" />
            <div className="flex-1 space-y-1.5">
              <Bar className="h-2 w-2/3" />
              <Bar className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>

      <div className="h-px w-full bg-white/10" />

      {/* Observing block */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-white/10" />
        <div className="flex-1 space-y-2">
          <Bar className="h-3 w-1/3" />
          <Bar className="h-3 w-3/4" />
        </div>
      </div>
    </div>
  );
}
