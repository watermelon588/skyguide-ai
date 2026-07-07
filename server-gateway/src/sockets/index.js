const alignmentSocket = require("./alignmentSocket");
const alignmentEngineSocket = require("./alignmentEngineSocket");
const sensorSocket = require("./sensorSocket");
const socketMiddleware = require("../middleware/socketMiddleware");

module.exports = (io) => {
    io.use(socketMiddleware);
    alignmentSocket(io);
    sensorSocket(io);
    alignmentEngineSocket(io);
};