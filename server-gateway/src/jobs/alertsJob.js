const cron = require("node-cron");

const User = require("../models/Users");
const sendEmail = require("../utils/email");
const alertService = require("../services/alertService");
const notificationService = require("../services/notificationService");
const { localHour, localDate } = require("../utils/localTime");

/**
 * The event-alert job (Feature 7b).
 *
 * Sibling to `digestJob`, and deliberately built the same way: select by the
 * observer's LOCAL hour, create the notification FIRST so the unique `sentKey`
 * decides whether anything is sent, wrap every user so one bad location can't
 * end the batch.
 *
 * The difference is what it says. The digest is unconditional — it goes out
 * every evening because the observer asked for it. These are conditional: most
 * ticks send nothing at all, and that's the design. An alert that fires nightly
 * stops being an alert.
 *
 * Why 18:00 and not the digest's 17:00:
 *  - The engine's weather is a nowcast, so a "great night" reading is only as
 *    honest as its distance from the night. 18:00 is at or past sunset for most
 *    observers most of the year.
 *  - A 12 h ISS look-ahead from 18:00 covers the whole usable night.
 *  - It puts the alerts AFTER the default digest, which reads correctly: the
 *    digest plans the evening, the alert interrupts it.
 *
 * The schedule is offset from the digest's quarter-hour boundaries so the two
 * jobs don't open their engine calls on the same instant.
 */

const ALERTS_SCHEDULE = "5,20,35,50 * * * *";

/**
 * The local hour at which alerts are evaluated. Not a user preference: unlike
 * the digest (a message you schedule), an alert's timing is dictated by the sky,
 * and every trigger here is about tonight.
 */
const ALERT_HOUR_LOCAL = 18;

const hasRealLocation = (user) => {
  const c = user?.location?.coordinates;
  return Array.isArray(c) && c.length === 2 && !(c[0] === 0 && c[1] === 0);
};

/**
 * Evaluate and deliver one observer's alerts.
 *
 * @returns {Promise<{sent: number, duplicate: number}>}
 */
async function sendAlertsFor(user) {
  const tz = user.location?.timezone || "UTC";
  const date = localDate(tz);

  const alerts = await alertService.evaluate(user, {
    localDate: date,
    localMonth: date.slice(0, 7),
  });

  const stats = { sent: 0, duplicate: 0 };

  for (const alert of alerts) {
    // Create first: a null return means someone already sent this occasion, and
    // the email must not go either. The row IS the "already sent" record.
    const notification = await notificationService.create({
      user: user._id,
      type: alert.type,
      title: alert.title,
      body: alert.body,
      data: alert.data,
      sentKey: alert.sentKey,
    });

    if (!notification) {
      stats.duplicate++;
      continue;
    }
    stats.sent++;

    if (alert.email && user.notificationPrefs?.email !== false) {
      try {
        await sendEmail({
          email: user.email,
          subject: alert.email.subject,
          message: alert.email.text,
        });
      } catch (error) {
        // The in-app notification already landed; a mail failure must not undo
        // it or stop the remaining alerts.
        console.error(`Alert email failed for ${user.email}:`, error.message);
      }
    }
  }

  return stats;
}

/**
 * One tick: everyone whose local hour is the alert hour right now.
 *
 * Exported so it can be run directly (tests / manual trigger) without waiting on
 * the clock.
 */
async function runAlertsTick() {
  // Selected on `isActive` alone: each alert type gates on its OWN preference
  // inside alertService, and a user may have any one of four on. Filtering here
  // would have to duplicate that logic and would drift from it.
  const candidates = await User.find({ isActive: { $ne: false } });

  const stats = {
    considered: candidates.length,
    evaluated: 0,
    sent: 0,
    duplicate: 0,
    skipped: 0,
    failed: 0,
  };

  for (const user of candidates) {
    try {
      if (!hasRealLocation(user)) {
        stats.skipped++;
        continue;
      }

      const hour = localHour(user.location.timezone || "UTC");
      if (hour === null || hour !== ALERT_HOUR_LOCAL) {
        stats.skipped++;
        continue;
      }

      const result = await sendAlertsFor(user);
      stats.evaluated++;
      stats.sent += result.sent;
      stats.duplicate += result.duplicate;
    } catch (error) {
      stats.failed++;
      console.error(`Alerts failed for ${user?.email}:`, error.message);
    }
  }

  return stats;
}

let task = null;

/** Start the schedule. Idempotent — calling twice won't double-schedule. */
function start() {
  if (task) return task;
  task = cron.schedule(ALERTS_SCHEDULE, async () => {
    try {
      const stats = await runAlertsTick();
      if (stats.sent > 0) console.log("Alerts tick:", stats);
    } catch (error) {
      console.error("Alerts tick failed:", error.message);
    }
  });
  console.log(`🔔 Alerts job scheduled (${ALERTS_SCHEDULE})`);
  return task;
}

function stop() {
  task?.stop();
  task = null;
}

module.exports = {
  start,
  stop,
  runAlertsTick,
  sendAlertsFor,
  ALERT_HOUR_LOCAL,
};
