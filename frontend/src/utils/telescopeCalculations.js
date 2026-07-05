/**
 * Telescope optical calculations (demo/estimate only).
 *
 * Pure functions — no React, no storage. Given aperture + focal length they
 * derive the values the UI shows live while the user types. Formulas are
 * standard amateur-astronomy approximations; they are labelled as estimates in
 * the UI and are NOT authoritative science (that will live in the Astro Engine).
 */

/** Coerce a form value (string | number) to a positive number, else null. */
function num(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Focal ratio as a number (focal / aperture), or null if inputs are missing. */
export function focalRatio(aperture, focal) {
  const a = num(aperture);
  const f = num(focal);
  if (!a || !f) return null;
  return f / a;
}

/** Focal ratio formatted like "f/5" or "f/5.9". */
export function formatFocalRatio(aperture, focal) {
  const r = focalRatio(aperture, focal);
  if (!r) return "—";
  const label = r.toFixed(1).replace(/\.0$/, "");
  return `f/${label}`;
}

/** Maximum useful magnification ≈ 2× aperture(mm) (~50× per inch). */
export function maxMagnification(aperture) {
  const a = num(aperture);
  return a ? Math.round(a * 2) : null;
}

/** Estimated limiting (faintest) visual magnitude ≈ 7.5 + 5·log10(aperture cm). */
export function limitingMagnitude(aperture) {
  const a = num(aperture);
  if (!a) return null;
  return Math.round((7.5 + 5 * Math.log10(a / 10)) * 10) / 10;
}

/** Light-gathering vs a 7 mm dark-adapted pupil, "×" times. */
export function lightGathering(aperture) {
  const a = num(aperture);
  if (!a) return null;
  return Math.round((a / 7) ** 2);
}

/**
 * All derived optics for a telescope-like object.
 * @param {{ aperture_mm?, focal_length_mm? }} t
 */
export function computeDerived(t = {}) {
  const aperture = t.aperture_mm;
  const focal = t.focal_length_mm;
  return {
    focalRatio: focalRatio(aperture, focal),
    focalRatioLabel: formatFocalRatio(aperture, focal),
    maxMagnification: maxMagnification(aperture),
    limitingMagnitude: limitingMagnitude(aperture),
    lightGathering: lightGathering(aperture),
  };
}
