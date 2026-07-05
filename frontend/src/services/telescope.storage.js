/**
 * Telescope persistence service (temporary — LocalStorage).
 *
 * The ONLY place that touches storage for the telescope. Components and hooks
 * go through these functions, never `localStorage` directly. Session 11 will
 * swap the bodies for REST calls (POST/GET/PATCH/DELETE /telescopes) while
 * keeping this exact signature, so no UI changes are required.
 */

const STORAGE_KEY = "skyguide_telescope";

const hasStorage = () =>
  typeof window !== "undefined" && !!window.localStorage;

/** Load the saved telescope, or null if none / unreadable. */
export function loadTelescope() {
  if (!hasStorage()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Persist a telescope; returns the stored object (with a stable id). */
export function saveTelescope(telescope) {
  if (!hasStorage() || !telescope) return telescope;
  const record = {
    ...telescope,
    id: telescope.id || `tele_${Date.now().toString(36)}`,
    updatedAt: Date.now(),
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Storage full / disabled — the in-memory copy still works this session.
  }
  return record;
}

/** Remove the saved telescope. */
export function deleteTelescope() {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
