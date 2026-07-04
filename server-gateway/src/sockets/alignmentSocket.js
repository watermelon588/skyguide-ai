/**
 * Telescope pairing socket.
 *
 * The ROOM is the source of truth, not connection order. Whoever joins second
 * reconciles against who is already present, so the dashboard learns about the
 * phone regardless of which connected first (and after any reconnect).
 *
 * Events (see WEBSOCKET_PROTOCOL.md):
 *   in : join_room { roomId, role }, phone_connected { device }
 *   out: room_joined { success, roomId }, phone_connected { device, at },
 *        phone_disconnected { at }, pairing_error { message }
 *
 * Auth is handled upstream by socketMiddleware (pairing JWT). Because the JWT
 * is only checked at handshake, an expired token blocks NEW connections while
 * already-paired sockets stay connected — connection outlives the countdown.
 */
module.exports = (io) => {
    io.on("connection", (socket) => {
        console.log("Socket connected:", socket.id, "user:", socket.user?.userId);

        socket.on("join_room", async ({ roomId, role } = {}) => {
            // The pairing token is bound to a single room.
            if (!roomId || roomId !== socket.user?.roomId) {
                socket.emit("pairing_error", {
                    message: "Invalid pairing room.",
                });
                return;
            }

            const normalizedRole = role === "phone" ? "phone" : "dashboard";

            socket.join(roomId);
            socket.data.roomId = roomId;
            socket.data.role = normalizedRole;

            socket.emit("room_joined", { success: true, roomId });
            console.log(`${socket.id} joined ${roomId} as ${normalizedRole}`);

            // Reconcile against peers already in the room (order-independent).
            // Emit to the ROOM (io.to) — authoritative delivery to every
            // participant, not a sender-relative broadcast — so the dashboard
            // is notified whether the phone joined first, second, or reconnected.
            const peers = await io.in(roomId).fetchSockets();
            const others = peers.filter((s) => s.id !== socket.id);

            if (normalizedRole === "phone") {
                // A phone is present -> tell everyone in the room.
                io.to(roomId).emit("phone_connected", {
                    device: socket.data.device || "Mobile device",
                    at: Date.now(),
                });
            } else {
                // Dashboard joined: if a phone is already here, tell the room.
                const phone = others.find((s) => s.data.role === "phone");
                if (phone) {
                    io.to(roomId).emit("phone_connected", {
                        device: phone.data.device || "Mobile device",
                        at: Date.now(),
                    });
                }
            }
        });

        socket.on("phone_connected", ({ device } = {}) => {
            const roomId = socket.data.roomId;
            if (!roomId) {
                socket.emit("pairing_error", {
                    message: "Join a room before pairing.",
                });
                return;
            }

            socket.data.role = "phone";
            socket.data.device = device || "Mobile device";

            socket.to(roomId).emit("phone_connected", {
                device: socket.data.device,
                at: Date.now(),
            });
            console.log(`phone_connected in ${roomId}`);
        });

        socket.on("disconnect", () => {
            const { roomId, role } = socket.data;
            if (role === "phone" && roomId) {
                socket.to(roomId).emit("phone_disconnected", { at: Date.now() });
                console.log(`phone_disconnected in ${roomId}`);
            }
            console.log("Socket disconnected:", socket.id);
        });
    });
};
