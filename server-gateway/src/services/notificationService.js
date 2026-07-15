const mongoose = require("mongoose");

const Notification = require("../models/Notification");

/**
 * In-app notifications (Feature 7): create, list, mark read.
 *
 * Creation is IDEMPOTENT by `sentKey` — the cron may fire twice for the same
 * occasion (restart, overlapping tick, retry) and the unique index turns the
 * second attempt into a no-op instead of a duplicate. Callers get `null` back
 * when the notification already existed, which is how the digest job knows not
 * to send the email again either.
 *
 * The live push is emitted through the "/notifications" socket namespace when
 * an `io` is available; delivery is best-effort — the row is the source of
 * truth and the client refetches on mount regardless.
 */

const PAGE_SIZE = 20;

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/** Reference to the socket.io server, set once at boot by sockets/index.js. */
let io = null;
function bindIo(server) {
  io = server;
}

/** Push to every socket this user has open, if any. Never throws. */
function pushLive(userId, notification) {
  try {
    io?.of("/notifications")
      .to(`user:${String(userId)}`)
      .emit("notification:new", notification);
  } catch {
    // A failed push is not a failed notification — it's already persisted.
  }
}

/**
 * Create a notification unless `sentKey` already exists.
 *
 * @returns {Promise<object|null>} the public notification, or null if it was a
 *   duplicate (already sent for this occasion).
 */
async function create({ user, type, title, body, data = {}, sentKey }) {
  try {
    const doc = await Notification.create({
      user,
      type,
      title,
      body,
      data,
      sentKey,
    });
    const payload = doc.toJSON();
    pushLive(user, payload);
    return payload;
  } catch (error) {
    // 11000 = the sentKey guard did its job.
    if (error?.code === 11000) return null;
    throw error;
  }
}

/** A page of the user's notifications, newest first, + the unread count. */
async function list(userId, { before, limit = PAGE_SIZE } = {}) {
  const query = { user: userId };
  if (before) {
    const cursor = new Date(before);
    if (!Number.isNaN(cursor.getTime())) query.createdAt = { $lt: cursor };
  }

  const size = Math.min(Math.max(Number(limit) || PAGE_SIZE, 1), PAGE_SIZE);

  const [docs, unread] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).limit(size),
    Notification.countDocuments({ user: userId, readAt: null }),
  ]);

  return {
    notifications: docs.map((d) => d.toJSON()),
    unread,
    hasMore: docs.length === size,
  };
}

/** Mark one as read. Scoped to the owner so ids can't be probed. */
async function markRead(userId, id) {
  if (!mongoose.isValidObjectId(id)) throw httpError(404, "Notification not found.");

  const doc = await Notification.findOneAndUpdate(
    { _id: id, user: userId },
    { $set: { readAt: new Date() } },
    { new: true },
  );
  if (!doc) throw httpError(404, "Notification not found.");
  return doc.toJSON();
}

/** Mark every unread one as read. */
async function markAllRead(userId) {
  const result = await Notification.updateMany(
    { user: userId, readAt: null },
    { $set: { readAt: new Date() } },
  );
  return { marked: result.modifiedCount ?? 0 };
}

module.exports = {
  bindIo,
  create,
  list,
  markRead,
  markAllRead,
};
