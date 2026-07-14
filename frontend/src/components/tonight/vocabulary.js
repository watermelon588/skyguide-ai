/**
 * Shared visual vocabulary for the /tonight experience.
 *
 * Per DESIGN_SYSTEM.md, electric blue is the only saturated accent — so object
 * *types* are distinguished by glyph shape and neutral tone, while *score*
 * (importance) is what earns blue. Data viz stays in the same language as
 * the rest of the instrument.
 */

/** Canonical type key from whatever the catalog calls it. */
export function typeKey(objectType) {
  const t = (objectType || "").toLowerCase();
  if (t.includes("galaxy")) return "galaxy";
  if (t.includes("nebula")) return "nebula";
  if (t.includes("globular")) return "globular";
  if (t.includes("cluster")) return "cluster";
  if (t.includes("star")) return "star";
  return "other";
}

export const TYPE_META = {
  galaxy: { label: "Galaxy", symbol: "◍" },
  nebula: { label: "Nebula", symbol: "❋" },
  globular: { label: "Globular Cluster", symbol: "◉" },
  cluster: { label: "Open Cluster", symbol: "∴" },
  star: { label: "Star", symbol: "✦" },
  other: { label: "Object", symbol: "◇" },
};

export function typeMeta(objectType) {
  return TYPE_META[typeKey(objectType)];
}

/** 0–100 score -> tone. Only strong scores earn full electric blue. */
export function scoreColor(score) {
  if (score == null) return "#6B6C70";
  if (score >= 70) return "#1E63FF";
  if (score >= 50) return "#0049CD";
  if (score >= 30) return "#9D9D9C";
  return "#6B6C70";
}

/** Azimuth in degrees -> 16-wind compass point ("NNE"). */
export function compassPoint(azimuthDeg) {
  if (azimuthDeg == null) return "—";
  const points = [
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
  ];
  return points[Math.round(((azimuthDeg % 360) / 22.5)) % 16];
}

export function formatDegrees(value, digits = 1) {
  return value == null ? "—" : `${value.toFixed(digits)}°`;
}

export function formatMagnitude(value) {
  return value == null ? "—" : value.toFixed(1);
}

/** Light-years, compacted for dense tables ("2.5M ly"). */
export function formatDistance(ly) {
  if (ly == null) return "—";
  if (ly >= 1_000_000) return `${(ly / 1_000_000).toFixed(1)}M ly`;
  if (ly >= 1_000) return `${(ly / 1_000).toFixed(1)}k ly`;
  return `${Math.round(ly)} ly`;
}

/** Hour angle -> "2.3h E of meridian" style short label. */
export function formatHourAngle(hours) {
  if (hours == null) return "—";
  const side = hours < 0 ? "E" : "W";
  return `${Math.abs(hours).toFixed(1)}h ${side}`;
}

/** RA degrees -> "05h 34m", Dec degrees -> "+22° 01′". */
export function formatRA(raDeg) {
  if (raDeg == null) return "—";
  const totalHours = raDeg / 15;
  const h = Math.floor(totalHours);
  const m = Math.round((totalHours - h) * 60);
  return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
}

export function formatDec(decDeg) {
  if (decDeg == null) return "—";
  const sign = decDeg >= 0 ? "+" : "−";
  const abs = Math.abs(decDeg);
  const d = Math.floor(abs);
  const m = Math.round((abs - d) * 60);
  return `${sign}${String(d).padStart(2, "0")}° ${String(m).padStart(2, "0")}′`;
}
