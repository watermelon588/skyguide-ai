const User = require("../models/Users");
const Room = require("../models/Room");
const Message = require("../models/Message");
const geohash = require("../utils/geohash");
const profanity = require("../utils/profanity");
const moderationService = require("./moderationService");

/**
 * Community discovery — "who observes near me?" (Feature 6a).
 *
 * Pure gateway logic, zero astronomy: a `$geoNear` over the users'
 * `2dsphere` index, gated by each observer's own privacy settings, returning
 * a PRIVACY-SAFE shape. Exact coordinates and precise distances NEVER leave
 * this boundary — callers get a coarse distance *band* ("~15 km away") and the
 * city/region label the observer already chose to expose, nothing more.
 *
 * Reciprocity is enforced here too: an observer whose own profile is private
 * can't browse the map (you must be discoverable to discover). The controller
 * relays that as a `gate` reason rather than an error.
 */

// The radius chips the UI offers, in kilometres. The request is clamped to one
// of these so an arbitrary `?radius=99999` can't turn discovery into a scrape.
const RADII_KM = [25, 50, 100];
const DEFAULT_RADIUS_KM = 50;

// A hard cap on rows so a dense metro area can't return thousands of cards.
const MAX_RESULTS = 60;

/** Clamp an incoming radius to the allowed set (default 50 km). */
function normalizeRadius(value) {
  const km = Number(value);
  return RADII_KM.includes(km) ? km : DEFAULT_RADIUS_KM;
}

/** True once an observer has actually set a location (not the [0,0] default). */
function hasRealLocation(user) {
  const coords = user?.location?.coordinates;
  return (
    Array.isArray(coords) &&
    coords.length === 2 &&
    !(coords[0] === 0 && coords[1] === 0)
  );
}

/**
 * A coarse, non-invertible distance band. We intentionally lose precision:
 * meters could be triangulated back to a home address, so nearby observers
 * round to ~1 km and everyone past 5 km rounds to the nearest 5 km.
 */
function distanceBand(meters) {
  const km = meters / 1000;
  if (km < 1) return "under 1 km";
  if (km < 5) return `~${Math.round(km)} km`;
  return `~${Math.round(km / 5) * 5} km`;
}

/**
 * The map pin for an observer: the CENTRE of their geohash-4 cell.
 *
 * This is the only coordinate allowed across this boundary, and it is not
 * their location — it is the ~39 km × ~20 km cell their location falls in,
 * collapsed to a single point. Two observers in the same cell get byte-identical
 * pins. That is deliberate, and it is what makes this safe to publish: there is
 * no noise to average away, so polling the endpoint a thousand times reveals
 * exactly as much as polling it once.
 *
 * Reuses the cell already stored for regional chat rooms; computed on the fly
 * for observers who predate that field, so a legacy account still appears.
 *
 * @returns {{ latitude:number, longitude:number }|null}
 */
function approxPoint(row) {
  const cell =
    row.geohash4 ||
    (Array.isArray(row.location?.coordinates) &&
    row.location.coordinates.length === 2
      ? geohash.encode(row.location.coordinates[1], row.location.coordinates[0])
      : null);

  return cell ? geohash.decodeCenter(cell) : null;
}

/** "City, State, Country" from whatever labels exist, or null. */
function placeLabel(location) {
  const parts = [location?.city, location?.state, location?.country].filter(
    Boolean,
  );
  return parts.length ? parts.join(", ") : null;
}

/** Telescope one-liner for a card, or null. */
function telescopeSummary(telescopeProfile) {
  const scope = telescopeProfile?.[0];
  if (!scope) return null;
  return {
    name: scope.name || "Telescope",
    aperture_mm: scope.aperture_mm ?? null,
  };
}

/**
 * Observers within `radiusKm` of `currentUser`, nearest first.
 *
 * @param {import("mongoose").Document} currentUser  the signed-in viewer
 * @param {number|string} radius                     requested radius (km)
 * @returns {Promise<{gate: string|null, radiusKm: number, count: number,
 *   observers: Array, center: {latitude,longitude}|null}>}
 *
 * `center` is the VIEWER's own cell centre — what the map opens on. Same
 * treatment as everyone else's pin (see approxPoint): the viewer knows where
 * they are, but sending their exact fix back would mean this response contains
 * a precise location, and it never should.
 *
 * `gate` is one of:
 *   "private"     — the viewer is private, so can't browse (reciprocity)
 *   "no-location" — the viewer hasn't set a location yet
 *   null          — results returned
 */
async function findNearby(currentUser, radius) {
  const radiusKm = normalizeRadius(radius);
  const empty = { radiusKm, count: 0, observers: [], center: null };

  // Reciprocity: a private observer is invisible to others, so the map is
  // closed to them too. Surfaced as a gate the UI turns into a "make yourself
  // discoverable" nudge — never a hard error.
  if (currentUser.profileVisibility === "private") {
    return { gate: "private", ...empty };
  }
  if (!hasRealLocation(currentUser)) {
    return { gate: "no-location", ...empty };
  }

  const [lng, lat] = currentUser.location.coordinates;

  // Blocked either way — neither of us appears to the other, anywhere.
  const hidden = await moderationService.blockedIdsFor(currentUser._id);

  const rows = await User.aggregate([
    {
      // $geoNear MUST be the first stage. Its `query` pre-filters to observers
      // who have opted into discovery: not private, sharing their location,
      // active, not blocked either way, and not the viewer themselves.
      $geoNear: {
        near: { type: "Point", coordinates: [lng, lat] },
        distanceField: "distanceMeters",
        maxDistance: radiusKm * 1000,
        spherical: true,
        query: {
          _id: { $ne: currentUser._id, $nin: hidden },
          isActive: { $ne: false },
          profileVisibility: { $ne: "private" },
          showApproxLocation: { $ne: false },
        },
      },
    },
    { $limit: MAX_RESULTS },
    {
      // Distinct catalog objects each observer has logged — the "23 observed"
      // badge. Grouped by catalog_id so re-observations don't inflate it.
      $lookup: {
        from: "observations",
        let: { uid: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$user", "$$uid"] },
                  { $eq: ["$status", "observed"] },
                ],
              },
            },
          },
          { $group: { _id: "$catalog_id" } },
          { $count: "n" },
        ],
        as: "observedAgg",
      },
    },
    {
      // Explicit whitelist — never `toJSON()`. No email, no flags. `location`
      // and `distanceMeters` are projected because the mapping below NEEDS
      // them, and both are dropped there: only the labels, the coarse band and
      // the cell centre cross the boundary.
      $project: {
        _id: 0,
        username: 1,
        displayName: 1,
        avatar: 1,
        bio: 1,
        location: 1,
        geohash4: 1,
        telescopeProfile: 1,
        distanceMeters: 1,
        observedCount: {
          $ifNull: [{ $arrayElemAt: ["$observedAgg.n", 0] }, 0],
        },
      },
    },
  ]);

  const observers = rows.map((row) => ({
    username: row.username,
    displayName: row.displayName || "",
    avatar: row.avatar || "",
    bio: row.bio || "",
    place: placeLabel(row.location),
    // The raw metric is dropped here — only the band crosses the boundary.
    distanceBand: distanceBand(row.distanceMeters),
    // Cell centre, never the real fix. See approxPoint.
    approx: approxPoint(row),
    telescope: telescopeSummary(row.telescopeProfile),
    observedCount: row.observedCount || 0,
  }));

  return {
    gate: null,
    radiusKm,
    count: observers.length,
    observers,
    center: approxPoint(currentUser),
  };
}

/* ------------------------------------------------------------------ *
 * Chat rooms (Feature 6b + 6c)
 * ------------------------------------------------------------------ */

/** Newest-N messages kept per room. See Message model for the rationale. */
const HISTORY_CAP = 500;

/** Default page size for history reads. */
const PAGE_SIZE = 50;

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

const regionRoomKey = (cell) => `geo:${cell}`;

/**
 * The private room key for a pair of observers. Ids are SORTED so the pair maps
 * to exactly one room no matter who pinged whom — there is never a "his copy"
 * and "her copy" of the same conversation.
 */
const dmRoomKey = (a, b) =>
  `dm:${[String(a), String(b)].sort().join("_")}`;

/**
 * The observer's geohash-4 cell, backfilling it if the user predates the
 * field. Returns null when no location is set.
 */
async function ensureGeohash(user) {
  if (user.geohash4) return user.geohash4;
  if (!hasRealLocation(user)) return null;

  const [lng, lat] = user.location.coordinates;
  const cell = geohash.encode(lat, lng);
  // Persist so this is a one-time cost per legacy user.
  await User.findByIdAndUpdate(user._id, { geohash4: cell });
  return cell;
}

/** "SkyGuide · Kolkata region", or a neutral fallback when unlabelled. */
function regionRoomName(user) {
  const place = user.location?.city || user.location?.state || user.location?.country;
  return place ? `SkyGuide · ${place} region` : "SkyGuide · your region";
}

/**
 * Fetch-or-create a room doc. Names are captured once (on creation) and then
 * left alone — `$setOnInsert` — so the room keeps the name it was born with
 * instead of renaming per visitor.
 */
async function ensureRoom(key, kind, cell, name) {
  await Room.updateOne(
    { key },
    { $setOnInsert: { key, kind, geohash: cell, name } },
    { upsert: true },
  );
  return Room.findOne({ key });
}

/**
 * The rooms available to this observer: their regional room (once a location is
 * set) plus one private room per accepted ping.
 *
 * There is no global room by design — see the Room model.
 */
async function listRooms(user) {
  const rooms = [];

  const cell = await ensureGeohash(user);
  if (cell) {
    const regionRoom = await ensureRoom(
      regionRoomKey(cell),
      "region",
      cell,
      regionRoomName(user),
    );
    rooms.push({
      key: regionRoom.key,
      kind: "region",
      name: regionRoom.name,
      description: "Observers who share your patch of sky (~39 km).",
      memberCount: await User.countDocuments({ geohash4: cell }),
    });
  }

  // Private rooms. A direct room is named for the OTHER participant, resolved
  // per viewer — there's no single name that reads correctly for both people.
  const directRooms = await Room.find({ kind: "direct", participants: user._id })
    .populate("participants", "username displayName avatar")
    .sort({ updatedAt: -1 })
    .lean();

  // A block shouldn't nuke the room (unblocking restores it), but it must
  // disappear from the list while it stands.
  const hidden = new Set(
    (await moderationService.blockedIdsFor(user._id)).map(String),
  );

  for (const room of directRooms) {
    const other = room.participants.find(
      (p) => String(p._id) !== String(user._id),
    );
    if (!other || hidden.has(String(other._id))) continue;

    rooms.push({
      key: room.key,
      kind: "direct",
      name: other.displayName || other.username,
      description: `Private conversation with @${other.username}`,
      username: other.username,
      avatar: other.avatar || "",
      memberCount: 2,
    });
  }

  return { rooms, hasRegion: Boolean(cell) };
}

/**
 * Authorize a room read/write.
 *
 *   region — your OWN cell only; otherwise every cell on Earth would be
 *            readable by anyone who could guess a geohash.
 *   direct — you must be one of the two stored participants, and the room only
 *            exists because the other person accepted your ping.
 *
 * Note: chat is deliberately NOT gated on profileVisibility. Discovery hides a
 * private observer from being *found*; chat is something they actively opt into
 * by speaking, so the choice stays theirs.
 */
async function assertRoomAccess(user, roomKey) {
  const key = String(roomKey || "");

  if (key.startsWith("dm:")) {
    const room = await Room.findOne({ key, kind: "direct" }).lean();
    // 404-shaped message: never confirm a private room exists to a non-member.
    if (!room) throw httpError(404, "Conversation not found.");

    const isMember = room.participants.some(
      (p) => String(p) === String(user._id),
    );
    if (!isMember) throw httpError(404, "Conversation not found.");

    const other = room.participants.find((p) => String(p) !== String(user._id));
    if (other && (await moderationService.isBlockedBetween(user._id, other))) {
      throw httpError(403, "This conversation is unavailable.");
    }
    return;
  }

  const cell = await ensureGeohash(user);
  if (!cell) {
    throw httpError(403, "Set your observing location to join a regional room.");
  }
  if (key !== regionRoomKey(cell)) {
    throw httpError(403, "You can only join your own regional room.");
  }
}

/** Public shape of a message — author identity only, never the raw user doc. */
function serializeMessage(doc) {
  const author = doc.user || {};
  return {
    id: String(doc._id),
    room: doc.room,
    body: doc.body,
    createdAt: doc.createdAt,
    author: {
      username: author.username || "unknown",
      displayName: author.displayName || "",
      avatar: author.avatar || "",
    },
  };
}

/**
 * A page of room history, OLDEST-first for direct rendering. Pagination walks
 * backwards: pass the oldest `createdAt` you hold as `before` to fetch older.
 */
async function getMessages(user, roomKey, { before, limit = PAGE_SIZE } = {}) {
  await assertRoomAccess(user, roomKey);

  const query = { room: roomKey };

  // Blocked either way: their messages simply aren't part of this reader's
  // history. Filtered in the QUERY, not after, so a page never comes back
  // half-empty because the blocked author filled it.
  const hidden = await moderationService.blockedIdsFor(user._id);
  if (hidden.length) query.user = { $nin: hidden };

  if (before) {
    const cursor = new Date(before);
    if (!Number.isNaN(cursor.getTime())) query.createdAt = { $lt: cursor };
  }

  const size = Math.min(Math.max(Number(limit) || PAGE_SIZE, 1), PAGE_SIZE);

  // Newest-first from the index, then reversed — so we page from the end while
  // handing the client chronological order.
  const docs = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(size)
    .populate("user", "username displayName avatar")
    .lean();

  return {
    messages: docs.reverse().map(serializeMessage),
    hasMore: docs.length === size,
  };
}

/**
 * Trim a room to the newest HISTORY_CAP messages. Reads the cap-th newest
 * timestamp and deletes everything older in one go, so cost stays flat no
 * matter how far over the cap a busy room ran.
 */
async function pruneRoom(roomKey) {
  const marker = await Message.find({ room: roomKey })
    .sort({ createdAt: -1 })
    .skip(HISTORY_CAP - 1)
    .limit(1)
    .select("createdAt")
    .lean();

  if (marker.length === 0) return; // under the cap, nothing to do
  await Message.deleteMany({
    room: roomKey,
    createdAt: { $lt: marker[0].createdAt },
  });
}

/**
 * The OTHER participant of a direct room, as a userId string — or null when the
 * room isn't a DM (regional rooms have derived, unbounded membership, so "the
 * recipient" isn't a meaningful notion there). Used to decide who, if anyone,
 * gets a message notification.
 */
async function directCounterpart(roomKey, senderId) {
  if (!String(roomKey).startsWith("dm:")) return null;
  const room = await Room.findOne({ key: roomKey, kind: "direct" })
    .select("participants")
    .lean();
  if (!room) return null;
  const other = room.participants.find((p) => String(p) !== String(senderId));
  return other ? String(other) : null;
}

/** Validate + persist a message, returning its public shape. */
async function postMessage(user, roomKey, rawBody) {
  await assertRoomAccess(user, roomKey);

  const raw = String(rawBody ?? "").trim();
  if (!raw) throw httpError(400, "Message cannot be empty.");
  if (raw.length > 500) throw httpError(400, "Message must be 500 characters or fewer.");

  // Mask rather than reject: a false positive shouldn't eat someone's whole
  // observation report. Masked at write time so the stored copy is clean too.
  const body = profanity.mask(raw);

  const doc = await Message.create({ room: roomKey, user: user._id, body });
  await pruneRoom(roomKey);

  return serializeMessage({
    ...doc.toObject(),
    user: {
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
    },
  });
}

module.exports = {
  findNearby,
  listRooms,
  getMessages,
  postMessage,
  directCounterpart,
  assertRoomAccess,
  ensureRoom,
  ensureGeohash,
  regionRoomKey,
  dmRoomKey,
  RADII_KM,
  DEFAULT_RADIUS_KM,
  HISTORY_CAP,
};
