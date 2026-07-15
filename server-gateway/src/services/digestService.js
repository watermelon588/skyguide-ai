const astroEngine = require("../services/astroEngineClient");
const Observation = require("../models/Observation");

/**
 * The nightly digest (Feature 7) — "tonight looks like this".
 *
 * A COMPOSITION job, not new science: it asks the astro engine the same
 * questions /tonight already asks, folds in the observer's planner, and renders
 * the result. No astronomy is computed here (see CLAUDE.md — that belongs to
 * the engine).
 *
 * Everything is best-effort per source: if the moon call fails the digest still
 * goes out with targets. It returns null only when there's genuinely nothing
 * worth sending.
 */

const TOP_N = 3;

/**
 * Object names, cached in-process.
 *
 * The catalog is static science content, so re-fetching it per user per night
 * would be pure waste — one nightly batch would hammer the engine with the same
 * request hundreds of times. Cached for a day; a miss just means unnamed
 * targets, never a failed digest.
 */
const CATALOG_TTL_MS = 24 * 60 * 60 * 1000;
let catalogCache = { at: 0, byId: null };

async function catalogNames() {
  if (catalogCache.byId && Date.now() - catalogCache.at < CATALOG_TTL_MS) {
    return catalogCache.byId;
  }
  try {
    const objects = await astroEngine.fetchCatalog();
    // Only ~30 of 110 objects have a common name ("Orion Nebula"); the rest are
    // known by their id alone. Skip the empty ones so callers' `||` fallback to
    // catalog_id does the right thing.
    const byId = new Map(
      objects.filter((o) => o.name).map((o) => [o.catalog_id, o.name]),
    );
    catalogCache = { at: Date.now(), byId };
    return byId;
  } catch (error) {
    // Never fail a digest over names — but don't fail SILENTLY either: an empty
    // map degrades every target to a bare id, which is worth knowing about.
    console.error("Catalog fetch failed; digest targets fall back to ids:", error.message);
    return catalogCache.byId ?? new Map();
  }
}

/** Plain-language verdict for a 0-100 sky score. */
function verdictFor(score) {
  if (score >= 80) return "an excellent night";
  if (score >= 60) return "a good night";
  if (score >= 40) return "a workable night";
  return "a difficult night";
}

/**
 * Gather the digest payload for one observer.
 *
 * @param {object} user  a User document with a real location
 * @returns {Promise<object|null>} digest data, or null if there's nothing to say
 */
async function buildDigest(user) {
  const observer = {
    latitude: user.location.coordinates[1],
    longitude: user.location.coordinates[0],
    timezone: user.location.timezone || "UTC",
  };

  // Targets are the digest's reason to exist — if this fails, there's no digest.
  let observable;
  try {
    observable = await astroEngine.fetchObservable(observer);
  } catch {
    return null;
  }

  const objects = Array.isArray(observable?.objects) ? observable.objects : [];
  if (objects.length === 0) return null;

  // The visibility payload's `name` is null for most objects — names live in
  // the catalog, so merge by catalog_id exactly as /tonight does client-side.
  const names = await catalogNames();

  const top = [...objects]
    .sort((a, b) => (b.visibility_score ?? 0) - (a.visibility_score ?? 0))
    .slice(0, TOP_N)
    .map((o) => ({
      catalog_id: o.catalog_id,
      // Last resort is the id itself — "M13" reads fine; "null" does not.
      name: o.name || names.get(o.catalog_id) || o.catalog_id,
      object_type: o.object_type,
      score: Math.round(o.visibility_score ?? 0),
      // `set` already arrives as a LOCAL "HH:MM" string from the engine — it is
      // not an ISO timestamp, so it must not be re-parsed or re-zoned.
      setsAt: o.set ?? null,
      circumpolar: Boolean(o.circumpolar),
    }));

  // Moon is a nice-to-have — a failure must not kill the digest.
  let moon = null;
  try {
    const moonData = await astroEngine.fetchMoon(observer);
    const m = moonData?.moon ?? moonData;
    if (m) {
      moon = {
        phase: m.phase ?? m.phase_name ?? null,
        // The engine reports illumination as a PERCENT already (1.9 = 1.9%).
        // Don't "normalise" it — a 0.5% new moon would become 50%.
        illumination:
          typeof m.illumination === "number" ? Math.round(m.illumination) : null,
      };
    }
  } catch {
    moon = null;
  }

  // The observer's own plan (gateway-owned data — no engine call).
  const planned = await Observation.find({ user: user._id, status: "planned" })
    .select("catalog_id")
    .lean();
  const plannedIds = planned.map((p) => p.catalog_id);

  // Which planned objects are actually up tonight — the single most actionable
  // line in the whole email.
  const upTonight = objects
    .filter((o) => plannedIds.includes(o.catalog_id))
    .map((o) => o.catalog_id);

  const best = top[0]?.score ?? 0;

  return {
    date: new Intl.DateTimeFormat("en-GB", {
      timeZone: observer.timezone,
      day: "numeric",
      month: "long",
    }).format(new Date()),
    place: user.location.city || user.location.country || "your location",
    timezone: observer.timezone,
    score: best,
    verdict: verdictFor(best),
    visibleCount: objects.length,
    top,
    moon,
    planned: { total: plannedIds.length, upTonight },
  };
}

/** One-line summary used as the in-app notification body. */
function summarize(digest) {
  const names = digest.top.map((t) => t.name).join(", ");
  const moonBit = digest.moon?.phase
    ? ` Moon: ${digest.moon.phase}${
        digest.moon.illumination != null ? ` (${digest.moon.illumination}%)` : ""
      }.`
    : "";
  const planBit = digest.planned.upTonight.length
    ? ` ${digest.planned.upTonight.length} of your planned objects are up.`
    : "";
  return `Looks like ${digest.verdict} — ${digest.visibleCount} objects up. Best: ${names}.${moonBit}${planBit}`;
}

/** Plain-text email body. Grounded: only facts present in `digest`. */
function renderEmailText(digest, user) {
  const name = user.displayName || user.username;
  const lines = [
    `Tonight over ${digest.place} — ${digest.date}`,
    "",
    `Hi ${name},`,
    "",
    `Tonight looks like ${digest.verdict}. ${digest.visibleCount} catalog objects are above your horizon.`,
    "",
    "Top targets:",
    ...digest.top.map((t, i) => {
      const when = t.circumpolar
        ? "up all night"
        : t.setsAt
          ? `sets ${t.setsAt}`
          : "";
      return `  ${i + 1}. ${t.name} (${t.catalog_id}) — score ${t.score}${when ? ` · ${when}` : ""}`;
    }),
  ];

  if (digest.moon?.phase) {
    lines.push(
      "",
      `Moon: ${digest.moon.phase}${
        digest.moon.illumination != null
          ? `, ${digest.moon.illumination}% illuminated`
          : ""
      }.`,
    );
  }

  if (digest.planned.total > 0) {
    lines.push(
      "",
      digest.planned.upTonight.length
        ? `From your plan, these are up tonight: ${digest.planned.upTonight.join(", ")}.`
        : `None of your ${digest.planned.total} planned objects are up tonight.`,
    );
  }

  lines.push("", "Clear skies,", "SkyGuide AI", "", "— Turn digests off in your profile settings.");
  return lines.join("\n");
}

module.exports = { buildDigest, summarize, renderEmailText, verdictFor };
