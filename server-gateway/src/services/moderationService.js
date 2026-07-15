const mongoose = require("mongoose");

const Block = require("../models/Block");
const Report = require("../models/Report");
const Message = require("../models/Message");
const User = require("../models/Users");

/**
 * Community safety primitives (Feature 6c): blocking and reporting.
 *
 * Kept as a leaf module — communityService and pingService both depend on
 * `blockedIdsFor`, and nothing here depends on them, so there are no cycles.
 */

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * Every user id that must be invisible to `userId`, in BOTH directions:
 * people they blocked, and people who blocked them.
 *
 * The symmetry is the point. A one-way block would let the blocked party keep
 * watching — which is exactly what someone blocking harassment is trying to
 * stop. So a block hides each from the other everywhere: discovery, messages,
 * and pings.
 *
 * @returns {Promise<mongoose.Types.ObjectId[]>}
 */
async function blockedIdsFor(userId) {
  const blocks = await Block.find({
    $or: [{ blocker: userId }, { blocked: userId }],
  })
    .select("blocker blocked")
    .lean();

  const ids = new Set();
  for (const b of blocks) {
    const other =
      String(b.blocker) === String(userId) ? b.blocked : b.blocker;
    ids.add(String(other));
  }
  return [...ids].map((id) => new mongoose.Types.ObjectId(id));
}

/** True if either party has blocked the other. */
async function isBlockedBetween(a, b) {
  const found = await Block.findOne({
    $or: [
      { blocker: a, blocked: b },
      { blocker: b, blocked: a },
    ],
  }).lean();
  return Boolean(found);
}

/** Resolve a username to a user, or 404. */
async function requireUserByUsername(username) {
  const user = await User.findOne({
    username: String(username || "").toLowerCase(),
  });
  if (!user) throw httpError(404, "Observer not found.");
  return user;
}

/** Block an observer. Idempotent — blocking twice is a no-op, not an error. */
async function blockUser(currentUser, username) {
  const target = await requireUserByUsername(username);
  if (String(target._id) === String(currentUser._id)) {
    throw httpError(400, "You can't block yourself.");
  }

  await Block.updateOne(
    { blocker: currentUser._id, blocked: target._id },
    { $setOnInsert: { blocker: currentUser._id, blocked: target._id } },
    { upsert: true },
  );

  return { username: target.username, blocked: true };
}

/** Lift a block. */
async function unblockUser(currentUser, username) {
  const target = await requireUserByUsername(username);
  await Block.deleteOne({ blocker: currentUser._id, blocked: target._id });
  return { username: target.username, blocked: false };
}

/** The people this observer has blocked (not those who blocked them). */
async function listBlocks(currentUser) {
  const blocks = await Block.find({ blocker: currentUser._id })
    .populate("blocked", "username displayName avatar")
    .sort({ createdAt: -1 })
    .lean();

  return blocks
    .filter((b) => b.blocked)
    .map((b) => ({
      username: b.blocked.username,
      displayName: b.blocked.displayName || "",
      avatar: b.blocked.avatar || "",
      blockedAt: b.createdAt,
    }));
}

const REASONS = ["spam", "harassment", "inappropriate", "other"];

/**
 * Report a message. Snapshots the body so the evidence outlives history
 * pruning. Re-reporting the same message is a no-op (unique index).
 */
async function reportMessage(currentUser, messageId, reason = "other") {
  if (!mongoose.isValidObjectId(messageId)) {
    throw httpError(400, "Unknown message.");
  }

  const message = await Message.findById(messageId).lean();
  if (!message) throw httpError(404, "That message no longer exists.");

  if (String(message.user) === String(currentUser._id)) {
    throw httpError(400, "You can't report your own message.");
  }

  const cleanReason = REASONS.includes(reason) ? reason : "other";

  try {
    await Report.create({
      reporter: currentUser._id,
      reportedUser: message.user,
      message: message._id,
      room: message.room,
      body: message.body, // snapshot — the original may be pruned later
      reason: cleanReason,
    });
  } catch (error) {
    // Duplicate report from the same reporter: treat as already-done.
    if (error?.code !== 11000) throw error;
  }

  return { reported: true };
}

module.exports = {
  blockedIdsFor,
  isBlockedBetween,
  blockUser,
  unblockUser,
  listBlocks,
  reportMessage,
  REASONS,
};
