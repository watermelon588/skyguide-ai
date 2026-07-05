import { useCallback, useState } from "react";

import {
  loadTelescope,
  saveTelescope as persist,
  deleteTelescope as removePersisted,
} from "../services/telescope.storage";

/**
 * Owns the user's saved telescope.
 *
 * Mirrors the shape of useLocation: read current value, save, delete. State is
 * seeded once from LocalStorage (lazy initialiser) and kept in sync on writes,
 * so the dashboard re-renders without a reload. Swapping telescope.storage for
 * a REST-backed service later requires no change here.
 */
export function useTelescope() {
  const [telescope, setTelescope] = useState(() => loadTelescope());

  const saveTelescope = useCallback((next) => {
    const saved = persist(next);
    setTelescope(saved);
    return saved;
  }, []);

  const deleteTelescope = useCallback(() => {
    removePersisted();
    setTelescope(null);
  }, []);

  return {
    telescope,
    hasTelescope: !!telescope,
    saveTelescope,
    deleteTelescope,
  };
}
