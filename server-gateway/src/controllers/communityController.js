const communityService = require("../services/communityService");
const pingService = require("../services/pingService");
const moderationService = require("../services/moderationService");

/**
 * Community controller (thin). Derives the viewer from the authenticated
 * request (never the body), delegates to communityService, shapes the HTTP
 * response. A `gate` in the payload is a normal 200 — it's a UX state
 * ("you're private" / "set your location"), not a failure.
 */

// GET /api/v1/community/nearby?radius=50
exports.getNearby = async (req, res, next) => {
  try {
    const result = await communityService.findNearby(req.user, req.query.radius);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/community/rooms
exports.getRooms = async (req, res, next) => {
  try {
    const result = await communityService.listRooms(req.user);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/community/rooms/:key/messages?before=<ISO>&limit=50
// History only — live messages arrive over the /community socket namespace.
exports.getRoomMessages = async (req, res, next) => {
  try {
    const result = await communityService.getMessages(req.user, req.params.key, {
      before: req.query.before,
      limit: req.query.limit,
    });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/* ------------------------------ pings ------------------------------ */

// POST /api/v1/community/pings  { username, note? }
exports.sendPing = async (req, res, next) => {
  try {
    const result = await pingService.sendPing(
      req.user,
      req.body.username,
      req.body.note,
    );

    // Live nudge to the recipient's personal channel, if they're online.
    if (result.ping && !result.autoAccepted) {
      req.app
        .get("io")
        ?.of("/community")
        .to(`user:${String(req.body.username).toLowerCase()}`)
        .emit("ping:new", result.ping);
    }

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/community/pings
exports.getPings = async (req, res, next) => {
  try {
    const result = await pingService.listPings(req.user);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/community/pings/:id  { action: "accept" | "decline" }
exports.respondToPing = async (req, res, next) => {
  try {
    const result = await pingService.respondToPing(
      req.user,
      req.params.id,
      req.body.action,
    );

    // Tell the requester their ping landed, so their room list refreshes.
    if (result.room && result.ping?.user?.username) {
      req.app
        .get("io")
        ?.of("/community")
        .to(`user:${result.ping.user.username}`)
        .emit("ping:accepted", { room: result.room });
    }

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/* --------------------------- moderation ---------------------------- */

// POST /api/v1/community/blocks  { username }
exports.blockUser = async (req, res, next) => {
  try {
    const result = await moderationService.blockUser(req.user, req.body.username);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/community/blocks/:username
exports.unblockUser = async (req, res, next) => {
  try {
    const result = await moderationService.unblockUser(
      req.user,
      req.params.username,
    );
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/community/blocks
exports.getBlocks = async (req, res, next) => {
  try {
    const blocked = await moderationService.listBlocks(req.user);
    res.status(200).json({ success: true, data: { blocked } });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/community/reports  { messageId, reason }
exports.reportMessage = async (req, res, next) => {
  try {
    const result = await moderationService.reportMessage(
      req.user,
      req.body.messageId,
      req.body.reason,
    );
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
