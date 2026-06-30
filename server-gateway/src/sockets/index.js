const alignmentSocket = require("./alignmentSocket");
const socketMiddleware = require("../middleware/socketMiddleware");

module.exports = (io) => {
    io.use(socketMiddleware);
    alignmentSocket(io);
};