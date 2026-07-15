/**
 * Numeric formatting shared by the alignment workspace panels.
 *
 * Its own module (rather than living beside the panel components) so the
 * component files export only components — react-refresh can't hot-reload a
 * file that mixes the two.
 */

/** Fixed-decimal, or an em dash for anything that isn't a finite number. */
export const fmt = (v, d) =>
  typeof v === "number" && Number.isFinite(v) ? v.toFixed(d) : "—";
