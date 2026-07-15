const socketSessionAuth = require("../middleware/socketSessionAuth");
const notificationService = require("../services/notificationService");

/**
 * Notification socket (Feature 7) — live delivery of `notification:new`.
 *
 * Its own namespace with session-cookie auth, for the same reason
 * /community has one: the DEFAULT namespace is gated on a telescope *pairing*
 * token, which a browser session doesn't have.
 *
 * There are no inbound events. Each socket joins a private `user:<id>` room and
 * only ever listens; notifications are created by the gateway (cron or an API
 * call) and pushed through notificationService.pushLive(). The socket is a
 * delivery optimisation — the REST list is the source of truth, so a missed
 * push costs a refresh, not a notification.
 */
module.exports = (io) => {
  const nsp = io.of("/notifications");

  nsp.use(socketSessionAuth);

  nsp.on("connection", (socket) => {
    socket.join(`user:${socket.data.userId}`);
  });

  // Let the service emit without importing `io` (avoids a require cycle).
  notificationService.bindIo(io);
};
