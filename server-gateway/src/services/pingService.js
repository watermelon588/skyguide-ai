const Ping = require("../models/Ping");
const Room = require("../models/Room");
const User = require("../models/Users");
const communityService = require("./communityService");
const moderationService = require("./moderationService");

/**
 * Ping requests — the consent gate in front of direct messages (Feature 6c).
 *
 * Flow: A pings B -> B accepts -> a private room is created for the pair and
 * appears in both their room lists. Nothing is created on send, so an ignored
 * or declined ping leaves no conversation behind. This is what makes DMs
 * tractable to moderate: every private room was invited by its recipient.
 */

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/** Public shape of a ping — identity only, never the raw user docs. */
function serialize(ping, counterpart) {
  return {
    id: String(ping._id),
    status: ping.status,
    note: ping.note || "",
    createdAt: ping.createdAt,
    respondedAt: ping.respondedAt,
    user: {
      username: counterpart?.username || "unknown",
      displayName: counterpart?.displayName || "",
      avatar: counterpart?.avatar || "",
    },
  };
}

/**
 * Send a chat request. Returns `{ ping, room }` — `room` is non-null only when
 * the pair already had an accepted conversation (in which case this is a no-op
 * that just points the caller at it).
 */
async function sendPing(currentUser, username, note = "") {
  const target = await User.findOne({
    username: String(username || "").toLowerCase(),
  });
  if (!target) throw httpError(404, "Observer not found.");

  if (String(target._id) === String(currentUser._id)) {
    throw httpError(400, "You can't ping yourself.");
  }

  // A block is silent in both directions: don't confirm the person exists.
  if (await moderationService.isBlockedBetween(currentUser._id, target._id)) {
    throw httpError(404, "Observer not found.");
  }

  // Already talking? Hand back the existing room instead of a second request.
  const existingRoom = await Room.findOne({
    key: communityService.dmRoomKey(currentUser._id, target._id),
  }).lean();
  if (existingRoom) {
    return { ping: null, room: existingRoom.key, alreadyConnected: true };
  }

  // They already asked us — accept theirs rather than opening a mirror request.
  const inbound = await Ping.findOne({
    from: target._id,
    to: currentUser._id,
    status: "pending",
  });
  if (inbound) {
    const result = await respondToPing(currentUser, String(inbound._id), "accept");
    return { ...result, autoAccepted: true };
  }

  try {
    const ping = await Ping.create({
      from: currentUser._id,
      to: target._id,
      note: String(note || "").trim().slice(0, 140),
    });
    return { ping: serialize(ping, target), room: null };
  } catch (error) {
    if (error?.code === 11000) {
      throw httpError(409, "You've already pinged this observer.");
    }
    throw error;
  }
}

/** Incoming (to me) and outgoing (from me) pending requests. */
async function listPings(currentUser) {
  const [incoming, outgoing] = await Promise.all([
    Ping.find({ to: currentUser._id, status: "pending" })
      .populate("from", "username displayName avatar")
      .sort({ createdAt: -1 })
      .lean(),
    Ping.find({ from: currentUser._id, status: "pending" })
      .populate("to", "username displayName avatar")
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  // A pending ping from someone since blocked shouldn't sit in the inbox.
  const hidden = new Set(
    (await moderationService.blockedIdsFor(currentUser._id)).map(String),
  );

  return {
    incoming: incoming
      .filter((p) => p.from && !hidden.has(String(p.from._id)))
      .map((p) => serialize(p, p.from)),
    outgoing: outgoing
      .filter((p) => p.to && !hidden.has(String(p.to._id)))
      .map((p) => serialize(p, p.to)),
  };
}

/**
 * Accept or decline an incoming ping. Only the RECIPIENT may respond — the
 * sender accepting their own request would defeat the entire consent gate.
 *
 * Accepting creates the private room (idempotently).
 */
async function respondToPing(currentUser, pingId, action) {
  const ping = await Ping.findById(pingId);
  if (!ping) throw httpError(404, "Request not found.");

  if (String(ping.to) !== String(currentUser._id)) {
    throw httpError(403, "Only the recipient can respond to this request.");
  }
  if (ping.status !== "pending") {
    throw httpError(409, "This request has already been answered.");
  }
  if (await moderationService.isBlockedBetween(ping.from, ping.to)) {
    throw httpError(403, "This request is unavailable.");
  }

  if (action === "decline") {
    ping.status = "declined";
    ping.respondedAt = new Date();
    await ping.save();
    return { ping: serialize(ping, null), room: null };
  }

  if (action !== "accept") {
    throw httpError(400, "Action must be 'accept' or 'decline'.");
  }

  const requester = await User.findById(ping.from).select(
    "username displayName avatar",
  );
  if (!requester) throw httpError(404, "Observer not found.");

  const key = communityService.dmRoomKey(ping.from, ping.to);
  await Room.updateOne(
    { key },
    {
      $setOnInsert: {
        key,
        kind: "direct",
        geohash: null,
        participants: [ping.from, ping.to],
        // Stored name is a fallback for logs; each viewer sees the other's name.
        name: "Direct message",
      },
    },
    { upsert: true },
  );

  ping.status = "accepted";
  ping.respondedAt = new Date();
  await ping.save();

  return { ping: serialize(ping, requester), room: key };
}

module.exports = { sendPing, listPings, respondToPing };
