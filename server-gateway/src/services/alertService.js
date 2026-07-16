const astroEngine = require("./astroEngineClient");
const digestService = require("./digestService");
const Observation = require("../models/Observation");
const { localInstant, DAY_MS } = require("../utils/localTime");

/**
 * Event alerts (Feature 7b) — the triggers that sit on top of the Feature 7a
 * notification engine.
 *
 * Where the digest is a scheduled summary ("here is tonight"), these are
 * conditional nudges ("something is happening"): a great night, a bright ISS
 * pass, a planned object running out of season, a lunar milestone. The plumbing
 * — idempotency, the live push, delivery — already exists; this module only
 * decides WHETHER there is something worth saying, and what.
 *
 * Design notes:
 *  - Evaluation is PURE with respect to the database: nothing is written here.
 *    Each trigger returns a descriptor and `alertsJob` does the persisting, so
 *    a trigger can be reasoned about (and tested) without a send.
 *  - Every trigger is gated on its own preference and checks it FIRST, because
 *    the gate is what keeps the engine calls from happening at all.
 *  - Engine calls are lazily memoized per user (see `nightContext`): a user with
 *    only ISS alerts on costs one call, not four, and two triggers that want the
 *    same sky snapshot share it.
 *  - A failed source yields null, never an exception. One unreachable endpoint
 *    silences one alert; it must not cost the observer the other three.
 */

// --- Trigger thresholds -----------------------------------------------------

/** Roadmap's bar for "great night": the top of the "Very Good" quality band. */
const GREAT_NIGHT_SCORE = 75;

/** ISS look-ahead. From the 18:00 local tick this spans the whole night. */
const ISS_WINDOW_HOURS = 12;

/** Below this peak altitude a pass is low, brief, and usually behind something. */
const ISS_MIN_PEAK_DEG = 40;

/**
 * The reference hour for "is this object well placed?" — prime observing time,
 * and crucially a FIXED clock time, so tonight and a fortnight from tonight are
 * measured against the same sky position rather than against whenever the job
 * happened to run.
 */
const PRIME_HOUR_LOCAL = 22;

/**
 * How far ahead to look for the plan-urgency comparison. An object's setting
 * time drifts ~28 min earlier per week, so a fortnight is the horizon over which
 * "still up at 22:00" flips to "gone by 22:00" — i.e. the season ending.
 */
const PLAN_HORIZON_DAYS = 14;

/** Visibility score below which an object isn't worth planning a night around. */
const PLAN_GOOD_SCORE = 35;

/**
 * Most fading objects to mention in one night. Planned objects near each other
 * in the sky fade together, and five notifications at once reads as spam. The
 * rest keep their monthly key and get their turn on a later night.
 */
const PLAN_MAX_ALERTS = 2;

/** At or below this illumination the Moon has effectively left the night sky. */
const NEW_MOON_ILLUMINATION = 5;

/** Mean synodic month — used only to anchor a lunation, never for ephemerides. */
const SYNODIC_MONTH_DAYS = 29.530588;

// --- Small formatting helpers ----------------------------------------------

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

/** Azimuth in degrees -> an 8-point compass label. */
function compass(azimuthDeg) {
  if (typeof azimuthDeg !== "number") return null;
  return COMPASS[Math.round(azimuthDeg / 45) % 8];
}

/**
 * The date of the new moon nearest to now, as YYYY-MM-DD — the stable identity
 * of the current lunation.
 *
 * `age_days` counts forward from the last new moon, so `now - age` lands on that
 * new moon and is constant however often we sample. Past the halfway point we
 * anchor on the NEXT one instead, so the waning crescent and the following new
 * moon (both dark, days apart) can't produce two different keys for one window.
 *
 * The engine rounds `age_days` to 2 dp (±7 min), so a new moon falling within
 * minutes of UTC midnight could flip the date between two evaluations. The cost
 * is one duplicate notification per few centuries; the alternative is a coarser
 * key that would miss a second event in the same month.
 */
function lunationKey(ageDays) {
  const sinceNearest =
    ageDays > SYNODIC_MONTH_DAYS / 2 ? ageDays - SYNODIC_MONTH_DAYS : ageDays;
  return new Date(Date.now() - sinceNearest * DAY_MS).toISOString().slice(0, 10);
}

/**
 * How to write an object in prose.
 *
 * Only ~30 of the 110 catalog objects have a common name; the rest are known by
 * their id alone. `display` is what you call it, `full` adds the id only when it
 * says something new — "Orion Nebula (M42)", but plain "M4", never "M4 (M4)".
 */
function nameOf(id, names) {
  const name = names.get(id);
  return {
    display: name || id,
    full: name ? `${name} (${id})` : id,
  };
}

/** id -> visibility score, for one engine sky snapshot. */
function scoresById(sky) {
  const objects = Array.isArray(sky?.objects) ? sky.objects : [];
  return new Map(objects.map((o) => [o.catalog_id, o.visibility_score ?? 0]));
}

// --- Per-user engine context ------------------------------------------------

/**
 * Lazily-memoized engine access for one observer's evaluation.
 *
 * Each source is fetched at most once and shared between triggers (great-night
 * and plan-urgency both want tonight's sky). Failures resolve to null rather
 * than rejecting, so a trigger reads a missing source the same way it reads an
 * empty one.
 */
function nightContext(user) {
  const observer = {
    latitude: user.location.coordinates[1],
    longitude: user.location.coordinates[0],
    timezone: user.location.timezone || "UTC",
  };

  const cache = new Map();
  const once = (key, fn) => {
    if (!cache.has(key)) cache.set(key, fn().catch(() => null));
    return cache.get(key);
  };

  return {
    observer,
    weather: () =>
      once("weather", () => astroEngine.fetchWeather(observer)),
    moon: () => once("moon", () => astroEngine.fetchMoon(observer)),
    passes: () =>
      once("passes", () =>
        astroEngine.fetchSatellitePasses({
          ...observer,
          hours: ISS_WINDOW_HOURS,
          // The station is only a sighting when it's lit and the sky isn't. A
          // geometric midday pass is real and completely unseeable — alerting on
          // one would send the observer outside for nothing.
          visibleOnly: true,
        }),
      ),
    /**
     * The sky at an ISO-8601 UTC instant. Magnitude-filtered against the ~13k
     * catalog but NOT result-limited: plan-urgency looks planned objects up by
     * id, so they must all be present however they rank.
     */
    skyAt: (time) =>
      once(`sky:${time}`, () =>
        astroEngine.fetchObservable(observer, { time, maxMagnitude: 13 }),
      ),
  };
}

// --- Triggers ---------------------------------------------------------------

/**
 * Great night — conditions score at or above the bar.
 *
 * Honest limitation: the engine's weather is a NOWCAST, not a forecast, so this
 * describes conditions at evaluation time. That is why the job evaluates at
 * 18:00 local rather than mid-afternoon — near dusk the nowcast is the closest
 * available proxy for the night ahead.
 */
async function greatNight(user, ctx, localDate) {
  if (!user.notificationPrefs?.greatNight) return null;

  const weather = await ctx.weather();
  const conditions = weather?.observing_conditions;
  const score = conditions?.observing_score;
  if (typeof score !== "number" || score < GREAT_NIGHT_SCORE) return null;

  // The best target is a nice-to-have; a missing sky costs the sentence, not
  // the alert.
  const sky = await ctx.skyAt(localInstant(ctx.observer.timezone, PRIME_HOUR_LOCAL));
  const objects = Array.isArray(sky?.objects) ? sky.objects : [];
  const best = [...objects].sort(
    (a, b) => (b.visibility_score ?? 0) - (a.visibility_score ?? 0),
  )[0];

  let bestLine = "";
  if (best) {
    // The sky object already carries its common name — no catalog lookup.
    const label = best.name ? `${best.name} (${best.catalog_id})` : best.catalog_id;
    bestLine = ` Best target tonight: ${label}.`;
  }

  const title = `Tonight is a great night — ${score}/100`;
  const body = `${conditions.observing_quality} conditions. ${conditions.recommendation}${bestLine}`;

  return {
    type: "great_night",
    title,
    body,
    data: { href: "/tonight", score },
    sentKey: `great_night:${localDate}:${user._id}`,
    email: {
      subject: `A great night over ${user.location.city || "you"} — ${score}/100`,
      text: [
        title,
        "",
        body,
        "",
        "Clear skies,",
        "SkyGuide AI",
        "",
        "— Turn great-night alerts off in your profile settings.",
      ].join("\n"),
    },
  };
}

/** ISS pass — the soonest bright, actually-visible pass in the window. */
async function issPass(user, ctx, localDate) {
  if (!user.notificationPrefs?.issAlerts) return null;

  const data = await ctx.passes();
  const passes = Array.isArray(data?.passes) ? data.passes : [];

  // The engine sweeps the window in order, but sorting keeps "soonest" true
  // here rather than depending on that.
  const next = passes
    .filter((p) => (p.max_altitude_deg ?? 0) >= ISS_MIN_PEAK_DEG)
    .sort((a, b) => String(a.rise?.utc).localeCompare(String(b.rise?.utc)))[0];

  if (!next?.peak?.utc) return null;

  const from = compass(next.rise?.azimuth_deg);
  const to = compass(next.set?.azimuth_deg);
  const peakAlt = Math.round(next.max_altitude_deg);

  const title = `ISS passes overhead at ${next.peak.local}`;
  const body =
    `Rises ${next.rise.local}${from ? ` in the ${from}` : ""}, peaks ${peakAlt}° ` +
    `at ${next.peak.local}, sets ${next.set.local}${to ? ` in the ${to}` : ""}. ` +
    `Visible for about ${Math.round(next.duration_minutes)} minutes — no telescope needed.`;

  return {
    type: "iss_pass",
    title,
    body,
    // Keyed on the DATE, not on the pass.
    //
    // The pass's own peak time looks like the natural key, but the engine
    // re-solves the pass from each call's window start, so peak_utc jitters by
    // milliseconds between calls. Four ticks fall inside the alert hour, and a
    // key built from a jittering timestamp is a different key each time — the
    // uniqueness guard would never fire and the observer would get four
    // identical alerts. One ISS alert per night is both robust and enough.
    sentKey: `iss_pass:${localDate}:${user._id}`,
    data: { href: "/dashboard", peakAltitude: peakAlt, at: next.peak.utc },
    email: {
      subject: `ISS overhead tonight at ${next.peak.local}`,
      text: [
        title,
        "",
        body,
        "",
        "Clear skies,",
        "SkyGuide AI",
        "",
        "— Turn ISS alerts off in your profile settings.",
      ].join("\n"),
    },
  };
}

/**
 * Plan urgency — planned objects whose season is ending.
 *
 * Compares the same clock hour tonight and in a fortnight. An object well placed
 * now but gone (or poor) then is being carried out of the evening sky by the
 * Earth's orbit — this really is one of the last chances for a while.
 *
 * @returns {Promise<object[]>} zero or more descriptors
 */
async function planUrgency(user, ctx, localMonth) {
  if (!user.notificationPrefs?.planUrgency) return [];

  const planned = await Observation.find({ user: user._id, status: "planned" })
    .select("catalog_id")
    .lean();
  if (planned.length === 0) return [];

  const tz = ctx.observer.timezone;
  const tonightAt = localInstant(tz, PRIME_HOUR_LOCAL);
  const laterAt = localInstant(tz, PRIME_HOUR_LOCAL, PLAN_HORIZON_DAYS);
  if (!tonightAt || !laterAt) return [];

  const [tonight, later] = await Promise.all([
    ctx.skyAt(tonightAt),
    ctx.skyAt(laterAt),
  ]);
  // Without BOTH snapshots there's no comparison, and a one-sided guess would
  // tell the observer their target is leaving when it isn't.
  if (!tonight || !later) return [];

  const now = scoresById(tonight);
  const then = scoresById(later);

  const fading = planned
    .map((p) => p.catalog_id)
    // Absent from a snapshot = below the horizon at that hour, so -1 (never
    // "good") is the correct reading, not a missing value.
    .filter(
      (id) =>
        (now.get(id) ?? -1) >= PLAN_GOOD_SCORE && (then.get(id) ?? -1) < PLAN_GOOD_SCORE,
    )
    .sort((a, b) => (now.get(b) ?? 0) - (now.get(a) ?? 0))
    .slice(0, PLAN_MAX_ALERTS);

  if (fading.length === 0) return [];

  // Names come straight from tonight's payload — every fading object was in it
  // (it scored well tonight), so its common name is already to hand.
  const names = digestService.namesFromObjects(tonight.objects);

  return fading.map((id) => {
    const { display, full } = nameOf(id, names);
    return {
      type: "plan_urgency",
      title: `Catch ${display} while you can`,
      body:
        `${full} is still well placed at ${PRIME_HOUR_LOCAL}:00 tonight, but in ` +
        `${PLAN_HORIZON_DAYS} days it will be gone from your evening sky. It's on your plan — ` +
        `this is one of your last good windows for a while.`,
      data: { href: `/tonight/${id}`, catalog_id: id },
      // Monthly: one nudge per planned object per month, however many nights it
      // spends fading.
      sentKey: `plan_urgency:${id}:${localMonth}:${user._id}`,
      email: null, // in-app only, per the alert catalog
    };
  });
}

/**
 * Moon milestones — the dark-sky window opening, and a full supermoon.
 *
 * Both are keyed to the lunation rather than the date, so an event that spans
 * several nights announces itself once.
 */
async function moonMilestone(user, ctx) {
  if (!user.notificationPrefs?.moonEvents) return null;

  const data = await ctx.moon();
  const moon = data?.moon;
  if (!moon || typeof moon.age_days !== "number") return null;

  const lunation = lunationKey(moon.age_days);
  const illumination = Math.round(moon.illumination);

  if (moon.reserved?.supermoon) {
    return {
      type: "moon",
      title: "Supermoon tonight",
      body:
        `Tonight's full Moon is near its closest approach — ${Math.round(moon.angular_diameter_arcmin)}′ ` +
        `across and ${illumination}% lit. Superb for craters along the limb, and a hard night ` +
        `for faint deep-sky targets.`,
      data: { href: "/dashboard", illumination },
      sentKey: `moon:supermoon:${lunation}:${user._id}`,
      email: null,
    };
  }

  if (moon.illumination <= NEW_MOON_ILLUMINATION) {
    return {
      type: "moon",
      title: "The dark-sky window is open",
      body:
        `New moon — only ${illumination}% lit, so the sky is as dark as it gets where you are. ` +
        `The next few nights are the month's best for faint galaxies and nebulae.`,
      data: { href: "/tonight", illumination },
      sentKey: `moon:new:${lunation}:${user._id}`,
      email: null,
    };
  }

  return null;
}

/**
 * Every alert this observer has earned right now.
 *
 * Triggers run concurrently — they share the memoized context, so the overlap is
 * free, and the slow ones (satellite sweep, two sky snapshots) overlap instead
 * of queueing.
 *
 * @param {object} user  a User document with a real location
 * @param {{localDate: string, localMonth: string}} when  the observer's local
 *   calendar buckets, supplied by the caller so idempotency keys agree with the
 *   job's own view of the clock
 * @returns {Promise<object[]>} notification descriptors, ready to persist
 */
async function evaluate(user, { localDate, localMonth }) {
  const ctx = nightContext(user);

  const results = await Promise.all([
    greatNight(user, ctx, localDate),
    issPass(user, ctx, localDate),
    planUrgency(user, ctx, localMonth),
    moonMilestone(user, ctx),
  ]);

  return results.flat().filter(Boolean);
}

module.exports = {
  evaluate,
  // Exported for tests: the date maths, the naming, and the thresholds are the
  // parts most worth pinning down without an engine.
  localInstant,
  lunationKey,
  compass,
  nameOf,
  GREAT_NIGHT_SCORE,
  ISS_MIN_PEAK_DEG,
  ISS_WINDOW_HOURS,
  PRIME_HOUR_LOCAL,
  PLAN_HORIZON_DAYS,
  PLAN_GOOD_SCORE,
  NEW_MOON_ILLUMINATION,
};
