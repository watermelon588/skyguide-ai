/**
 * Observer-local clock arithmetic.
 *
 * Everything scheduled in SkyGuide is scheduled in the observer's own timezone —
 * 17:00 has to mean 17:00 where they actually observe, not on the server. Both
 * the digest and the alerts select their recipients this way, and the alert
 * triggers compare the same clock hour across days, so this lives in one place.
 *
 * Intl is the only DST-correct timezone table available without a dependency;
 * every function here is a thin, defensive wrapper over it. A bad IANA string on
 * a user document is data, not an exception — these return a safe fallback or
 * null rather than throwing into a batch job.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The observer's local hour (0-23) right now.
 *
 * @returns {number|null} null if the timezone is unusable
 */
function localHour(timezone, now = Date.now()) {
  try {
    return Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: timezone || "UTC",
        hour: "numeric",
        hourCycle: "h23",
      }).format(new Date(now)),
    );
  } catch {
    return null;
  }
}

/**
 * The observer's local calendar date (YYYY-MM-DD) — the daily idempotency
 * bucket. Falls back to the UTC date, which is wrong by at most a day and
 * cannot break a send.
 */
function localDate(timezone, now = Date.now()) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(now));
  } catch {
    return new Date(now).toISOString().slice(0, 10);
  }
}

/**
 * How far `timeZone` is from UTC at `date`, in ms.
 *
 * Formats the instant in the zone, reads it back as if it were UTC, and takes
 * the difference.
 */
function tzOffsetMs(timeZone, date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );

  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - date.getTime();
}

/**
 * The UTC instant at which it is `hour` o'clock, `dayOffset` days from today, in
 * `timeZone`.
 *
 * Resolved twice on purpose: the first pass uses the offset at the naive guess,
 * which is wrong for the couple of hours around a DST transition; re-reading the
 * offset AT the guess fixes it. Verified across a US/EU fall-back and a US/AU
 * spring-forward.
 *
 * @param {number} [now]  epoch ms to resolve from — injectable so the DST
 *   behaviour can be tested without waiting for October
 * @returns {string|null} ISO-8601 UTC, or null if the timezone is unusable
 */
function localInstant(timeZone, hour, dayOffset = 0, now = Date.now()) {
  try {
    const base = new Date(now + dayOffset * DAY_MS);
    const [year, month, day] = localDate(timeZone, base.getTime())
      .split("-")
      .map(Number);
    const naive = Date.UTC(year, month - 1, day, hour);

    const guess = new Date(naive - tzOffsetMs(timeZone, new Date(naive)));
    return new Date(naive - tzOffsetMs(timeZone, guess)).toISOString();
  } catch {
    return null;
  }
}

module.exports = { localHour, localDate, localInstant, tzOffsetMs, DAY_MS };
