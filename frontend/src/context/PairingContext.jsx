import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { useSocket } from "./SocketContext";
import { createRoom } from "../services/alignment.service";
import { useCountdown } from "../hooks/useCountdown";
import { initialPairingState, pairingReducer } from "./pairingReducer";

const PairingContext = createContext(null);

// How long the success state lingers before the modal auto-dismisses.
const SUCCESS_DISMISS_MS = 900;

function getDeviceLabel() {
  if (typeof navigator === "undefined") return "Mobile device";
  return (
    navigator.userAgentData?.platform || navigator.platform || "Mobile device"
  );
}

/**
 * The ONLY place that touches the pairing socket. Not exported — every
 * consumer in the tree reads state via usePairing() instead of calling
 * socket.on()/emit() itself, so there is exactly one socket per provider.
 *
 * Reconnects are handled by socket.io's default behavior: on every "connect"
 * (initial or automatic reconnect) we re-emit join_room, since the server
 * drops room membership when the transport drops.
 */
function usePairingChannel({ role, roomId, pairingToken, dispatch, socketRef }) {
  const createSocket = useSocket();

  useEffect(() => {
    if (!roomId || !pairingToken) return;

    const socket = createSocket(pairingToken);
    if (socketRef) socketRef.current = socket;

    socket.on("connect", () => {
      if (role === "phone") dispatch({ type: "PHONE_AUTHENTICATING" });
      socket.emit("join_room", { roomId, role });
    });

    socket.on("room_joined", () => {
      if (role === "phone") {
        socket.emit("phone_connected", { device: getDeviceLabel() });
      }
      // dashboard: stays "waiting" until a phone_connected event arrives
      // (either from a phone joining now, or the server's reconciliation of
      // a phone that was already in the room).
    });

    if (role === "dashboard") {
      socket.on("phone_connected", (payload) =>
        dispatch({
          type: "PHONE_CONNECTED",
          socketId: payload?.socketId,
          at: payload?.at,
          device: payload?.device,
        }),
      );
      socket.on("phone_disconnected", () =>
        dispatch({ type: "PHONE_DISCONNECTED" }),
      );
    } else {
      // The server broadcasts phone_connected to the whole room (io.to),
      // including the sender — used here as the authoritative "you are
      // paired" confirmation rather than assuming success optimistically.
      socket.on("phone_connected", () =>
        dispatch({ type: "PHONE_CONNECTED_SELF" }),
      );
      // The dashboard ended the session -> the phone leaves the paired state.
      socket.on("session_terminated", () =>
        dispatch({ type: "SESSION_TERMINATED" }),
      );
    }

    socket.on("pairing_error", (payload) =>
      dispatch({
        type: "SOCKET_ERROR",
        message: payload?.message || "Pairing failed.",
      }),
    );
    socket.on("connect_error", (err) =>
      dispatch({
        type: "SOCKET_ERROR",
        message: err?.message || "Connection failed.",
      }),
    );
    socket.on("disconnect", () => {
      if (role === "phone") dispatch({ type: "PHONE_SOCKET_LOST" });
    });

    socket.connect();

    return () => {
      if (socketRef && socketRef.current === socket) socketRef.current = null;
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [roomId, pairingToken, role, createSocket, dispatch, socketRef]);
}

/**
 * Dashboard-side pairing context — the single source of truth for pairing.
 *
 * Owns both the session state machine (via reducer) AND the modal visibility
 * (a pure UI concern kept out of the reducer). The modal never controls the
 * session: it opens for pairing, auto-closes on success so the dashboard
 * stays usable, and can be reopened as a read-only info panel. Disconnecting
 * is the only thing that ends the session, and it lives in the context — not
 * trapped inside the modal.
 */
export function PairingProvider({ children }) {
  const [state, dispatch] = useReducer(pairingReducer, initialPairingState);
  const [modalOpen, setModalOpen] = useState(false);

  const { minutes, seconds, totalSeconds, isExpired } = useCountdown(
    state.expiresAt,
  );

  // Live handle to the current dashboard socket so disconnect can signal the
  // phone before the socket is torn down.
  const socketRef = useRef(null);

  // Latest status without making the create/disconnect callbacks re-created.
  const statusRef = useRef(state.status);
  useEffect(() => {
    statusRef.current = state.status;
  }, [state.status]);

  // Auto-expire the QR only while nobody has connected yet — once paired,
  // the connection is authoritative and outlives the countdown.
  useEffect(() => {
    if (state.status === "waiting" && isExpired) {
      dispatch({ type: "SESSION_EXPIRED" });
    }
  }, [state.status, isExpired]);

  // On a successful pairing, hold the success beat then auto-close the modal
  // so the dashboard becomes the primary workspace. Fires once per transition
  // into "connected" — reopening later via Open Session won't re-trigger it.
  useEffect(() => {
    if (state.status !== "connected") return;
    const timer = setTimeout(() => setModalOpen(false), SUCCESS_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [state.status]);

  usePairingChannel({
    role: "dashboard",
    roomId: state.roomId,
    pairingToken: state.pairingToken,
    dispatch,
    socketRef,
  });

  const createPairingSession = useCallback(async () => {
    // A live connection is authoritative — never clobber it with a new room.
    if (statusRef.current === "connected") return;
    setModalOpen(true);
    dispatch({ type: "CREATE_START" });
    try {
      const res = await createRoom();
      const { roomId, token, expiresAt } = res.data;
      dispatch({ type: "CREATE_SUCCESS", roomId, token, expiresAt });
    } catch (err) {
      dispatch({
        type: "CREATE_ERROR",
        message:
          err.response?.data?.message ??
          err.message ??
          "Couldn't start a pairing session.",
      });
    }
  }, []);

  const disconnectPairing = useCallback(() => {
    setModalOpen(false);

    const socket = socketRef.current;
    if (!socket) {
      dispatch({ type: "RESET" });
      return;
    }

    // Keep the socket alive until the server acknowledges it has notified the
    // phone (session_terminated). Resetting earlier would clear roomId and let
    // the effect-cleanup disconnect the socket before the packet flushed —
    // dropping the notification. RESET goes straight to idle (no intermediate
    // status), so the card still morphs connected -> sync in one clean step.
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      dispatch({ type: "RESET" });
    };

    socket.emit("terminate_session", finish);
    // Fallback in case the ack never arrives (e.g. the socket dropped).
    setTimeout(finish, 400);
  }, []);

  const openSessionModal = useCallback(() => setModalOpen(true), []);
  const closeSessionModal = useCallback(() => setModalOpen(false), []);

  const value = useMemo(
    () => ({
      pairing: {
        status: state.status,
        roomId: state.roomId,
        pairingToken: state.pairingToken,
        expiresAt: state.expiresAt,
        phone: state.phone,
        error: state.error,
        modalOpen,
        remaining: {
          minutes,
          seconds,
          urgent: totalSeconds > 0 && totalSeconds < 60,
        },
      },
      // Stable ref to the live pairing socket. Consumers (sensor feed) attach
      // their own listeners keyed off pairing.status transitions — the socket
      // itself stays owned by usePairingChannel.
      socketRef,
      createPairingSession,
      disconnectPairing,
      openSessionModal,
      closeSessionModal,
    }),
    [
      state,
      modalOpen,
      minutes,
      seconds,
      totalSeconds,
      createPairingSession,
      disconnectPairing,
      openSessionModal,
      closeSessionModal,
    ],
  );

  return (
    <PairingContext.Provider value={value}>{children}</PairingContext.Provider>
  );
}

/**
 * Phone-side pairing context (mounted on /align).
 *
 * Read-only from the phone's perspective — it doesn't create or terminate
 * sessions, it just joins the room the QR pointed it at and reports status.
 */
export function AlignPairingProvider({ roomId, pairingToken, children }) {
  const [state, dispatch] = useReducer(
    pairingReducer,
    { roomId, pairingToken },
    (init) => ({
      ...initialPairingState,
      roomId: init.roomId,
      pairingToken: init.pairingToken,
      status: init.roomId && init.pairingToken ? "connecting" : "idle",
    }),
  );

  // Live handle to the phone socket so the sensor stream (useSensorStream)
  // can emit on the same connection instead of opening a second one.
  const socketRef = useRef(null);

  usePairingChannel({
    role: "phone",
    roomId: state.roomId,
    pairingToken: state.pairingToken,
    dispatch,
    socketRef,
  });

  const value = useMemo(
    () => ({
      pairing: {
        status: state.status,
        roomId: state.roomId,
        pairingToken: state.pairingToken,
        error: state.error,
      },
      socketRef,
    }),
    [state],
  );

  return (
    <PairingContext.Provider value={value}>{children}</PairingContext.Provider>
  );
}

export function usePairing() {
  const ctx = useContext(PairingContext);
  if (!ctx) {
    throw new Error("usePairing() must be used within a PairingProvider");
  }
  return ctx;
}
