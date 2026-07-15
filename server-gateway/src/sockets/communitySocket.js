const communityService = require("../services/communityService");
const moderationService = require("../services/moderationService");
const socketSessionAuth = require("../middleware/socketSessionAuth");

/**
 * Community chat socket (Feature 6b).
 *
 * Lives on its OWN namespace (`/community`) — deliberately, not on the default
 * namespace. The default namespace's `io.use(socketMiddleware)` gate expects a
 * *pairing* JWT bound to a telescope roomId, which a chat client simply does
 * not have. Namespace middleware is independent of `io.use()`, so this file
 * authenticates from the session cookie without touching, or being touched by,
 * the alignment/pairing sockets.
 *
 * Events
 *   in : chat:join { roomKey }, chat:message { roomKey, body },
 *        chat:typing { roomKey }, chat:leave { roomKey }
 *   out: chat:joined { roomKey }, chat:message { ...message },
 *        chat:presence { roomKey, count }, chat:typing { username, displayName },
 *        chat:error { message }
 *
 * The socket carries LIVE traffic only; history is fetched over REST
 * (GET /api/v1/community/rooms/:key/messages).
 */

/** Rate limit: 5 messages per 10s per user, across all their tabs. */
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10_000;

/** userId -> recent send timestamps (in-memory; resets on restart, which is fine). */
const sendLog = new Map();

function isRateLimited(userId) {
  const now = Date.now();
  const recent = (sendLog.get(userId) || []).filter(
    (t) => now - t < RATE_WINDOW_MS,
  );

  if (recent.length >= RATE_LIMIT) {
    sendLog.set(userId, recent);
    return true;
  }

  recent.push(now);
  sendLog.set(userId, recent);
  return false;
}

/**
 * Live presence = distinct USERS with a socket in the room (not socket count),
 * so three open tabs is still one observer. Connection-based only — we never
 * store "last seen", per the Feature 6 privacy decision.
 */
async function presenceCount(nsp, roomKey) {
  const sockets = await nsp.in(roomKey).fetchSockets();
  return new Set(sockets.map((s) => s.data.userId).filter(Boolean)).size;
}

async function emitPresence(nsp, roomKey) {
  nsp.to(roomKey).emit("chat:presence", {
    roomKey,
    count: await presenceCount(nsp, roomKey),
  });
}

module.exports = (io) => {
  const nsp = io.of("/community");

  // Cookie-session auth — independent of the pairing-token middleware on "/".
  nsp.use(socketSessionAuth);

  nsp.on("connection", (socket) => {
    const { user } = socket.data;

    // Rooms this socket has joined. Tracked explicitly because `socket.rooms`
    // is already cleared by the time `disconnect` fires, and presence has to be
    // refreshed for the rooms it just left.
    socket.data.joinedRooms = new Set();

    // A personal channel, so the REST layer can push `ping:new` / `ping:accepted`
    // to this observer wherever they are. Not a chat room — never counted in
    // presence, and only ever addressed by the server.
    socket.join(`user:${user.username}`);

    socket.on("chat:join", async ({ roomKey } = {}) => {
      try {
        // Authorization is re-checked here, not trusted from the client: the
        // same gate the REST history route uses.
        await communityService.assertRoomAccess(user, roomKey);

        socket.join(roomKey);
        socket.data.joinedRooms.add(roomKey);
        socket.emit("chat:joined", { roomKey });
        await emitPresence(nsp, roomKey);
      } catch (error) {
        socket.emit("chat:error", {
          message: error.message || "Could not join that room.",
        });
      }
    });

    socket.on("chat:leave", async ({ roomKey } = {}) => {
      if (!roomKey) return;
      socket.leave(roomKey);
      socket.data.joinedRooms.delete(roomKey);
      await emitPresence(nsp, roomKey);
    });

    socket.on("chat:message", async ({ roomKey, body } = {}) => {
      try {
        if (isRateLimited(socket.data.userId)) {
          socket.emit("chat:error", {
            message: "You're sending messages too quickly — slow down a moment.",
          });
          return;
        }

        // postMessage re-authorizes + validates before persisting.
        const message = await communityService.postMessage(user, roomKey, body);

        // Deliver per-socket rather than to the whole room: anyone who has
        // blocked the author (or whom the author blocked) must not receive it
        // live, exactly as they wouldn't see it in history. One block lookup
        // per message, not per recipient.
        const hidden = new Set(
          (await moderationService.blockedIdsFor(user._id)).map(String),
        );

        if (hidden.size === 0) {
          // Fast path: no blocks involving the author — one room broadcast.
          nsp.to(roomKey).emit("chat:message", message);
        } else {
          const peers = await nsp.in(roomKey).fetchSockets();
          for (const peer of peers) {
            if (!hidden.has(peer.data.userId)) {
              peer.emit("chat:message", message);
            }
          }
        }
      } catch (error) {
        socket.emit("chat:error", {
          message: error.message || "Message could not be sent.",
        });
      }
    });

    socket.on("chat:typing", ({ roomKey } = {}) => {
      if (!roomKey) return;
      // Sender-relative on purpose — you never see your own typing indicator.
      socket.to(roomKey).emit("chat:typing", {
        username: user.username,
        displayName: user.displayName || "",
      });
    });

    socket.on("disconnect", async () => {
      // This socket is already out of the room set, so the recount is accurate.
      for (const roomKey of socket.data.joinedRooms) {
        await emitPresence(nsp, roomKey);
      }
    });
  });
};
