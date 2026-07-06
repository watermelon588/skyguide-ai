/**
 * Sensor streaming relay.
 *
 * Transport-only: the paired phone emits sensor packets and the gateway
 * relays them verbatim to the rest of the pairing room (the dashboard).
 * No storage, no transformation, no math — the future Orientation and
 * Alignment engines consume this stream elsewhere.
 *
 * Events (see WEBSOCKET_PROTOCOL.md):
 *   in : sensor_frame  { v, seq, t, orientation, motion, screen }
 *        sensor_status { streaming, sensors, reason }
 *   out: sensor_frame  (relayed to room, volatile)
 *        sensor_status (relayed to room, guaranteed)
 *
 * Security: identity comes from socket.data — set by join_room AFTER the
 * pairing JWT was validated — never from the payload. Only phone-role
 * sockets may stream, and packets never leave the JWT-bound room.
 * Invalid packets are dropped silently: at 20Hz an error reply per bad
 * frame would just amplify traffic.
 */

// Generous ceiling — a v1 frame is ~400 bytes serialized. Anything bigger
// is malformed or hostile.
const MAX_PACKET_BYTES = 2048;

function streamRoomFor(socket) {
    const { role, roomId } = socket.data;
    return role === "phone" && roomId ? roomId : null;
}

function isRelayable(payload) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return false;
    }
    try {
        return JSON.stringify(payload).length <= MAX_PACKET_BYTES;
    } catch {
        return false;
    }
}

module.exports = (io) => {
    io.on("connection", (socket) => {
        socket.on("sensor_frame", (packet) => {
            const roomId = streamRoomFor(socket);
            if (!roomId || !isRelayable(packet)) return;

            // Volatile: if a receiver's buffer is congested, dropping a frame
            // beats delivering it late — the next one is ~50ms away.
            socket.to(roomId).volatile.emit("sensor_frame", packet);
        });

        socket.on("sensor_status", (status) => {
            const roomId = streamRoomFor(socket);
            if (!roomId || !isRelayable(status)) return;

            // Lifecycle transitions are rare and must arrive — not volatile.
            socket.to(roomId).emit("sensor_status", {
                ...status,
                at: Date.now(),
            });
        });
    });
};
