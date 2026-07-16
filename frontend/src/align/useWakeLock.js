import { useEffect } from "react";

/**
 * Keep the phone's screen awake while `active` (Screen Wake Lock API).
 *
 * A telescope session is minutes of not touching the phone — without this the
 * screen sleeps, the page is backgrounded and the sensor stream stops (the
 * exact "connection keeps dropping" UX complaint). The lock is released by
 * the OS on visibilitychange, so it is re-requested every time the page
 * becomes visible again. Unsupported browsers (iOS < 16.4) no-op gracefully.
 */
export function useWakeLock(active) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;

    let lock = null;
    let disposed = false;

    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request("screen");
      } catch {
        // Low battery / power-save mode can reject — nothing to do.
      }
    };

    const onVisibility = () => {
      if (!document.hidden && !disposed) acquire();
    };

    acquire();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisibility);
      lock?.release().catch(() => {});
    };
  }, [active]);
}
