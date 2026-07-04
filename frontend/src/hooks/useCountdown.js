import { useEffect, useState } from "react";

/**
 * Counts down to an absolute expiry timestamp.
 *
 * Recomputes remaining time from (target - now) on every tick, so it stays
 * accurate even if the tab is throttled or the interval drifts.
 *
 * @param {string|number|Date|null} expiresAt ISO string / ms / Date to count down to.
 * @returns {{ minutes:number, seconds:number, totalSeconds:number, isExpired:boolean }}
 */
export function useCountdown(expiresAt) {
  const targetMs = expiresAt != null ? new Date(expiresAt).getTime() : null;

  const compute = () => {
    if (targetMs == null || Number.isNaN(targetMs)) return 0;
    return Math.max(0, Math.floor((targetMs - Date.now()) / 1000));
  };

  const [totalSeconds, setTotalSeconds] = useState(compute);
  const [prevTarget, setPrevTarget] = useState(targetMs);

  // Reset during render (not in an effect) when the target changes, so the
  // displayed value updates immediately for a new session.
  if (targetMs !== prevTarget) {
    setPrevTarget(targetMs);
    setTotalSeconds(compute());
  }

  useEffect(() => {
    if (targetMs == null || Number.isNaN(targetMs)) return;

    const id = setInterval(() => {
      const next = compute();
      setTotalSeconds(next);
      if (next <= 0) clearInterval(id);
    }, 1000);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetMs]);

  return {
    minutes: Math.floor(totalSeconds / 60),
    seconds: totalSeconds % 60,
    totalSeconds,
    isExpired: targetMs != null && totalSeconds <= 0,
  };
}
