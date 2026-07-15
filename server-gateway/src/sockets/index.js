const alignmentSocket = require("./alignmentSocket");
const alignmentEngineSocket = require("./alignmentEngineSocket");
const sensorSocket = require("./sensorSocket");
const communitySocket = require("./communitySocket");
const notificationSocket = require("./notificationSocket");
const socketMiddleware = require("../middleware/socketMiddleware");

module.exports = (io) => {
    // Default namespace ("/") — telescope pairing/sensors/alignment. Gated by
    // the PAIRING token (socketMiddleware). io.use() applies here only.
    io.use(socketMiddleware);
    alignmentSocket(io);
    sensorSocket(io);
    alignmentEngineSocket(io);

    // Web-app namespaces. Both authenticate from the SESSION COOKIE
    // (socketSessionAuth) — a browser has no pairing token, so they must not
    // pass through the middleware above. Namespace middleware doesn't inherit
    // io.use(), which is what keeps the two schemes apart.
    communitySocket(io);
    notificationSocket(io);
};
