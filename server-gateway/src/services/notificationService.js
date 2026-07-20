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

/* ----------------------------- community ----------------------------- *
 * Feature 6 events (pings + direct messages) surfaced in the notification
 * centre. Pings map to one notification per event (unique sentKey); direct
 * messages COALESCE — a burst of DMs from one person while you're away is a
 * single "N new messages" row, not N rows — so the bell reflects reality
 * without becoming noise.
 * --------------------------------------------------------------------- */

/** Someone sent you a chat request. Recipient-facing. */
async function notifyPingRequest(recipientId, { pingId, fromUsername, fromDisplayName, note }) {
  const name = fromDisplayName || fromUsername || "An observer";
  const body = note
    ? `${name} wants to connect: “${String(note).slice(0, 100)}”`
    : `${name} wants to connect with you.`;
  return create({
    user: recipientId,
    type: "ping_request",
    title: "New chat request",
    body,
    data: { href: "/community", username: fromUsername, kind: "ping_request" },
    sentKey: `ping_req:${pingId}`,
  });
}

/** Your chat request was accepted. Requester-facing. */
async function notifyPingAccepted(requesterId, { pingId, byUsername, byDisplayName, room }) {
  const name = byDisplayName || byUsername || "An observer";
  return create({
    user: requesterId,
    type: "ping_accepted",
    title: "Chat request accepted",
    body: `${name} accepted your request — say hello.`,
    data: {
      href: room ? `/community/chat?room=${encodeURIComponent(room)}` : "/community/chat",
      username: byUsername,
      room: room || null,
      kind: "ping_accepted",
    },
    sentKey: `ping_acc:${pingId}`,
  });
}

/**
 * A new direct message arrived for someone not currently reading the room.
 *
 * Coalesces onto an existing UNREAD row for the same conversation: the count
 * climbs, the preview and timestamp refresh, and it re-pushes live. Once the
 * recipient reads it, the next message opens a fresh row (a new unique
 * sentKey), so "unread" always maps to a real, current occasion.
 */
async function notifyDirectMessage(recipientId, { room, messageId, fromUsername, fromDisplayName, preview }) {
  const name = fromDisplayName || fromUsername || "An observer";
  const href = `/community/chat?room=${encodeURIComponent(room)}`;
  const snippet = String(preview || "").slice(0, 120);

  const existing = await Notification.findOne({
    user: recipientId,
    type: "community_message",
    "data.room": room,
    readAt: null,
  }).sort({ createdAt: -1 });

  if (existing) {
    const count = (existing.data?.count || 1) + 1;
    existing.title = `${count} new messages from ${name}`;
    existing.body = snippet;
    existing.data = { ...existing.data, count, preview: snippet, messageId };
    existing.markModified("data");
    existing.createdAt = new Date(); // float it back to the top of the list
    await existing.save();
    const payload = existing.toJSON();
    pushLive(recipientId, payload);
    return payload;
  }

  return create({
    user: recipientId,
    type: "community_message",
    title: `New message from ${name}`,
    body: snippet,
    data: { href, room, username: fromUsername, count: 1, kind: "community_message" },
    sentKey: `dm:${messageId}`,
  });
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
  notifyPingRequest,
  notifyPingAccepted,
  notifyDirectMessage,
  list,
  markRead,
  markAllRead,
};
