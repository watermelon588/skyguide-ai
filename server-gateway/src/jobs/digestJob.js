const cron = require("node-cron");

const User = require("../models/Users");
const sendEmail = require("../utils/email");
const digestService = require("../services/digestService");
const notificationService = require("../services/notificationService");

/**
 * The daily digest job (Feature 7).
 *
 * Runs every 15 minutes and sends to whoever's LOCAL clock has just reached
 * their chosen digest hour. Timezones are why it can't be a single daily cron:
 * 17:00 has to mean 17:00 where the observer actually observes.
 *
 * Safety rails:
 *  - Idempotency lives in the DATA, not here: `sentKey` =
 *    `digest:<local-date>:<userId>` with a unique index. A restart, an
 *    overlapping tick, or a retry loses the race harmlessly. The email is only
 *    sent when the notification row was actually created, so the row IS the
 *    "already sent" record.
 *  - Users are processed sequentially. A digest is one-or-two engine calls per
 *    user; firing them all at once would hammer the engine for no benefit on a
 *    job with a 15-minute budget.
 *  - Every user is wrapped in try/catch — one bad location can't stop the batch.
 */

const EVERY_15_MIN = "*/15 * * * *";

/** The observer's local hour (0-23) right now, or null if the tz is unusable. */
function localHour(timezone) {
  try {
    return Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: timezone || "UTC",
        hour: "numeric",
        hourCycle: "h23",
      }).format(new Date()),
    );
  } catch {
    return null; // bad IANA string on the user doc
  }
}

/** The observer's local calendar date (YYYY-MM-DD) — the idempotency bucket. */
function localDate(timezone) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

const hasRealLocation = (user) => {
  const c = user?.location?.coordinates;
  return Array.isArray(c) && c.length === 2 && !(c[0] === 0 && c[1] === 0);
};

/** Send one observer's digest. Returns "sent" | "duplicate" | "skipped". */
async function sendDigestFor(user) {
  const tz = user.location?.timezone || "UTC";
  const sentKey = `digest:${localDate(tz)}:${user._id}`;

  const digest = await digestService.buildDigest(user);
  if (!digest) return "skipped"; // engine unreachable, or nothing above the horizon

  // Create FIRST: the unique sentKey is what makes this whole job safe to
  // re-run. If it returns null someone already sent this occasion — so we must
  // not send the email either.
  const notification = await notificationService.create({
    user: user._id,
    type: "digest",
    title: `Tonight looks like ${digest.verdict}`,
    body: digestService.summarize(digest),
    data: {
      href: "/tonight",
      score: digest.score,
      top: digest.top.map((t) => t.catalog_id),
    },
    sentKey,
  });

  if (!notification) return "duplicate";

  if (user.notificationPrefs?.email !== false) {
    try {
      await sendEmail({
        email: user.email,
        subject: `Tonight over ${digest.place} — ${digest.verdict}`,
        message: digestService.renderEmailText(digest, user),
      });
    } catch (error) {
      // The in-app notification already landed; a mail failure must not undo it
      // or crash the batch.
      console.error(`Digest email failed for ${user.email}:`, error.message);
    }
  }

  return "sent";
}

/**
 * One tick: everyone whose local hour == their digestHourLocal right now.
 * Exported so it can be run directly (tests / manual trigger) without waiting
 * on the clock.
 */
async function runDigestTick() {
  const candidates = await User.find({
    isActive: { $ne: false },
    "notificationPrefs.digest": { $ne: false },
  });

  const stats = { considered: candidates.length, sent: 0, duplicate: 0, skipped: 0, failed: 0 };

  for (const user of candidates) {
    try {
      if (!hasRealLocation(user)) {
        stats.skipped++;
        continue;
      }

      const tz = user.location.timezone || "UTC";
      const hour = localHour(tz);
      const want = user.notificationPrefs?.digestHourLocal ?? 17;

      if (hour === null || hour !== want) {
        stats.skipped++;
        continue;
      }

      const result = await sendDigestFor(user);
      stats[result === "sent" ? "sent" : result === "duplicate" ? "duplicate" : "skipped"]++;
    } catch (error) {
      stats.failed++;
      console.error(`Digest failed for ${user?.email}:`, error.message);
    }
  }

  return stats;
}

let task = null;

/** Start the schedule. Idempotent — calling twice won't double-schedule. */
function start() {
  if (task) return task;
  task = cron.schedule(EVERY_15_MIN, async () => {
    try {
      const stats = await runDigestTick();
      if (stats.sent > 0) console.log("Digest tick:", stats);
    } catch (error) {
      console.error("Digest tick failed:", error.message);
    }
  });
  console.log(`📬 Digest job scheduled (${EVERY_15_MIN})`);
  return task;
}

function stop() {
  task?.stop();
  task = null;
}

module.exports = { start, stop, runDigestTick, sendDigestFor, localHour, localDate };
