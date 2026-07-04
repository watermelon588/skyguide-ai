/**
 * Presentational MM:SS countdown display.
 *
 * Purely visual — the ticking lives in useCountdown, owned by the parent so a
 * single source drives both the display and expiry handling.
 *
 * @param {number} minutes
 * @param {number} seconds
 * @param {boolean} [urgent] render danger-red (e.g. under 60s)
 */
export default function CountdownTimer({ minutes, seconds, urgent = false }) {
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  return (
    <span
      className={`font-mono text-sm font-semibold tabular-nums ${
        urgent ? "text-[#EF4444]" : "text-white"
      }`}
    >
      {mm}:{ss}
    </span>
  );
}
