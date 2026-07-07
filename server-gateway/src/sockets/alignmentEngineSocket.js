/**
 * Alignment engine socket layer (Session 14).
 *
 * Bridges the existing pairing rooms to the alignment engine. Registers its
 * OWN `orientation_update` listener — sensorSocket's transport-only relay is
 * untouched; Socket.IO happily fans one inbound event to both modules.
 *
 * Events (see WEBSOCKET_PROTOCOL.md):
 *   in : alignment:set_target   { catalogId } | { ra, dec, name }   (dashboard)
 *        alignment:clear_target
 *        orientation_update     (phone — same packets sensorSocket relays)
 *   out: alignment:target  { target, ephemeris }        reliable, to room
 *        alignment:update   { ...errors, state, ... }   volatile, ≤10Hz, to room
 *        alignment:state    { state, previous, at }     reliable, transitions only
 *        alignment:error    { code, message }           reliable, to requester
 *
 * Traffic discipline: the phone's uplink is untouched; enrichment flows
 * dashboard-ward only (socket.to excludes the phone sender) and is throttled
 * to ALIGNMENT_EMIT_MS. Deliberately NOT volatile: sensorSocket's relay of
 * the same inbound event has just written to the transport, so a volatile
 * packet in the same tick reliably finds the buffer busy and is dropped —
 * 100% loss, verified. At ≤10Hz × ~300B, guaranteed delivery is cheap.
 */

const engine = require("../services/alignmentEngine");
const { AstroEngineClientError } = require("../services/astroEngineClient");

const ALIGNMENT_EMIT_MS = 100; // ≤10Hz dashboard-bound stream
const SWEEP_INTERVAL_MS = 1000;

const lastEmitAt = new Map(); // roomId → last alignment:update timestamp

const ERROR_MESSAGES = {
    NO_OBSERVER: "Set your observer location before aligning.",
    TARGET_NOT_FOUND: "That target is not in the catalog.",
    ENGINE_REJECTED: "The astronomy engine rejected the request.",
    ENGINE_UNAVAILABLE: "The astronomy engine is unreachable.",
    INVALID_TARGET: "Provide a catalog id or RA/DEC coordinates.",
    NOT_IN_ROOM: "Join a pairing room first.",
};

function emitError(socket, code, detail) {
    socket.emit("alignment:error", {
        code,
        message: ERROR_MESSAGES[code] || detail || "Alignment error.",
    });
}

function parseTarget(payload = {}) {
    const catalogId =
        typeof payload.catalogId === "string" ? payload.catalogId.trim() : "";
    if (catalogId && catalogId.length <= 64) return { catalogId };

    const { ra, dec } = payload;
    if (
        Number.isFinite(ra) && ra >= 0 && ra <= 360 &&
        Number.isFinite(dec) && dec >= -90 && dec <= 90
    ) {
        const name =
            typeof payload.name === "string" ? payload.name.slice(0, 100) : null;
        return { ra, dec, name };
    }
    return null;
}

module.exports = (io) => {
    // One sweeper for all rooms: flags sessions whose orientation stream
    // went silent and tells the room the alignment is lost.
    setInterval(() => {
        for (const { roomId, from } of engine.sweepLostStreams()) {
            io.to(roomId).emit("alignment:state", {
                state: "lost",
                previous: from,
                at: Date.now(),
            });
        }
    }, SWEEP_INTERVAL_MS).unref();

    io.on("connection", (socket) => {
        socket.on("alignment:set_target", async (payload) => {
            const { roomId, role } = socket.data;
            if (!roomId || role !== "dashboard") {
                emitError(socket, "NOT_IN_ROOM");
                return;
            }

            const target = parseTarget(payload);
            if (!target) {
                emitError(socket, "INVALID_TARGET");
                return;
            }

            try {
                const session = await engine.startSession({
                    roomId,
                    userId: socket.user.userId,
                    target,
                });
                io.to(roomId).emit("alignment:target", {
                    target: session.target,
                    telescope: session.telescope,
                    ephemeris: {
                        altitude_deg: session.ephemeris.altitude_deg,
                        azimuth_deg: session.ephemeris.azimuth_deg,
                        above_horizon: session.ephemeris.above_horizon,
                    },
                    at: Date.now(),
                });
            } catch (err) {
                const code =
                    err instanceof AstroEngineClientError || err.code
                        ? err.code
                        : "ENGINE_REJECTED";
                emitError(socket, code, err.message);
            }
        });

        socket.on("alignment:clear_target", () => {
            const { roomId, role } = socket.data;
            if (!roomId || role !== "dashboard") return;
            engine.clearSession(roomId);
            lastEmitAt.delete(roomId);
            io.to(roomId).emit("alignment:state", {
                state: "idle",
                previous: null,
                at: Date.now(),
            });
        });

        // Engine tap on the phone's orientation stream. Same identity guard
        // as sensorSocket: role comes from socket.data set by join_room.
        socket.on("orientation_update", (packet) => {
            const { role, roomId } = socket.data;
            if (role !== "phone" || !roomId) return;
            if (!packet || typeof packet !== "object") return;

            const now = Date.now();
            const outcome = engine.ingest(roomId, packet, now);
            if (!outcome) return;

            const { result, transition } = outcome;

            if (transition) {
                io.to(roomId).emit("alignment:state", {
                    state: transition.to,
                    previous: transition.from,
                    at: now,
                });
            }

            const last = lastEmitAt.get(roomId) ?? 0;
            if (transition || now - last >= ALIGNMENT_EMIT_MS) {
                lastEmitAt.set(roomId, now);
                socket.to(roomId).emit("alignment:update", result);
            }
        });

        socket.on("terminate_session", () => {
            const { roomId } = socket.data;
            if (roomId) {
                engine.clearSession(roomId);
                lastEmitAt.delete(roomId);
            }
        });

        socket.on("disconnect", async () => {
            const { roomId } = socket.data;
            if (!roomId || !engine.getSession(roomId)) return;
            // GC: drop the session once the room is empty (both peers gone).
            const peers = await io.in(roomId).fetchSockets();
            if (peers.length === 0) {
                engine.clearSession(roomId);
                lastEmitAt.delete(roomId);
            }
        });
    });
};
