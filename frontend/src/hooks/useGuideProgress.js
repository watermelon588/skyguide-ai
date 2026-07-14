import { useMemo } from "react";

import { useAuth } from "../context/AuthContext";
import { useTelescope } from "./useTelescope";
import { useObservations } from "./useObservations";
import { hasLocation } from "../utils/location";

/**
 * Per-step completion for the First Light Guide, derived purely from existing
 * app state — no new backend. For anonymous visitors everything reads
 * incomplete (the guide doubles as the product tour), so the auth-only
 * queries are gated off until sign-in.
 *
 * Returns `{ done: { [stepId]: boolean }, completed, trackable }` where a
 * step counts toward progress only if it's detectable (see `track` in
 * guide.steps). Untracked, purely-instructional steps never appear here.
 */
export function useGuideProgress() {
  const { isAuthenticated, user } = useAuth();
  const { hasTelescope } = useTelescope();
  const { planned, history } = useObservations({ enabled: isAuthenticated });

  return useMemo(() => {
    const located = isAuthenticated && hasLocation(user);
    const hasPlanned = planned.length > 0 || history.length > 0;
    const hasObserved = history.some((o) => o.status === "observed");

    // Only trackable steps (see guide.steps `track`) are listed here.
    const done = {
      account: isAuthenticated,
      location: located,
      telescope: isAuthenticated && hasTelescope,
      plan: hasPlanned,
      align: hasObserved,
      log: hasObserved,
    };

    const trackable = Object.keys(done).length;
    const completed = Object.values(done).filter(Boolean).length;

    return { done, completed, trackable };
  }, [isAuthenticated, user, hasTelescope, planned, history]);
}
