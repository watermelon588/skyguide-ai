import { useEffect, useState } from "react";
import { useSocket } from "../context/SocketContext";

/**
 * Manages one pairing socket for either side of a session.
 *
 * role "dashboard": connect → join_room → wait → phone_connected (peer detected)
 * role "phone":     connect → join_room → emit phone_connected → connected
 *
 * The socket lives only while `enabled` and a room+token are present; it is
 * fully torn down on cleanup (unmount, cancel, or a regenerated session).
 *
 * Status values:
 *   idle | connecting | authenticating | waiting | connected |
 *   phone_connected | disconnected | error
 *
 * @param {{ roomId?:string, token?:string, role:"dashboard"|"phone", enabled?:boolean }} opts
 * @returns {{ status:string, error:string }}
 */
export function usePairingSocket({ roomId, token, role, enabled = true }) {
  const createSocket = useSocket();

  const active = enabled && !!roomId && !!token;
  const connKey = active ? `${role}:${roomId}:${token}` : null;

  const [status, setStatus] = useState(active ? "connecting" : "idle");
  const [error, setError] = useState("");
  const [prevKey, setPrevKey] = useState(connKey);

  // Reset during render (not in an effect) when the connection target changes:
  // a new/regenerated session, or toggling (in)active.
  if (connKey !== prevKey) {
    setPrevKey(connKey);
    setStatus(active ? "connecting" : "idle");
    setError("");
  }

  useEffect(() => {
    if (!active) return;

    const socket = createSocket(token);

    socket.on("connect", () => {
      setStatus(role === "phone" ? "authenticating" : "waiting");
      socket.emit("join_room", { roomId, role });
    });

    socket.on("room_joined", () => {
      if (role === "phone") {
        socket.emit("phone_connected", { device: getDeviceLabel() });
        setStatus("connected");
      }
      // dashboard stays "waiting" until a phone_connected arrives
    });

    if (role === "dashboard") {
      socket.on("phone_connected", () => setStatus("phone_connected"));
      socket.on("phone_disconnected", () => setStatus("waiting"));
    }

    socket.on("pairing_error", (payload) => {
      setStatus("error");
      setError(payload?.message || "Pairing failed.");
    });

    socket.on("connect_error", (err) => {
      setStatus("error");
      setError(err?.message || "Connection failed.");
    });

    socket.on("disconnect", () => {
      if (role === "phone") setStatus("disconnected");
    });

    socket.connect();

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [active, roomId, token, role, createSocket]);

  return { status, error };
}

function getDeviceLabel() {
  if (typeof navigator === "undefined") return "Mobile device";
  return (
    navigator.userAgentData?.platform || navigator.platform || "Mobile device"
  );
}
