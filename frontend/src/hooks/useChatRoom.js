import { useCallback, useEffect, useRef, useState } from "react";

import { createCommunitySocket } from "../services/socket.service";
import { fetchRoomMessages } from "../services/community.service";

/**
 * One community chat room: socket lifecycle, live messages, presence, typing.
 *
 * Split of duties (per the Feature 6 contract): history comes over REST, the
 * socket carries live traffic only. On every (re)connect we re-join and re-pull
 * history — that single path doubles as the reconnect replay, so a client that
 * dropped mid-conversation converges instead of showing a hole.
 *
 * Sends are NOT optimistic: the server echoes each message back to the whole
 * room including the sender. That costs a round-trip but means the list only
 * ever shows what actually persisted — a rate-limited or rejected send simply
 * never appears, with no phantom to roll back.
 */

const TYPING_CLEAR_MS = 3000;

export function useChatRoom(roomKey) {
  const [messages, setMessages] = useState([]);
  const [presence, setPresence] = useState(0);
  const [typingName, setTypingName] = useState(null);
  const [status, setStatus] = useState("connecting"); // connecting | ready | error
  const [error, setError] = useState(null);

  const socketRef = useRef(null);
  const typingTimer = useRef(null);
  const lastTypingSent = useRef(0);
  // Set by the effect so callers can force a history re-pull (e.g. after a
  // block changes what the server will show them) without reconnecting.
  const reloadRef = useRef(null);

  // Switching rooms clears the previous room's stream. Adjusted during render
  // (React's documented "reset state when a prop changes" pattern) rather than
  // in an effect, so there's no cascading second render.
  const [prevRoomKey, setPrevRoomKey] = useState(roomKey);
  if (prevRoomKey !== roomKey) {
    setPrevRoomKey(roomKey);
    setMessages([]);
    setPresence(0);
    setTypingName(null);
    setError(null);
    setStatus("connecting");
  }

  useEffect(() => {
    if (!roomKey) return undefined;

    let cancelled = false;
    const socket = createCommunitySocket();
    socketRef.current = socket;

    const loadHistory = async () => {
      try {
        const data = await fetchRoomMessages(roomKey);
        if (cancelled) return;
        // Replace wholesale: this runs on join AND on every reconnect, so the
        // server's history is the source of truth for what came before.
        setMessages(data.messages);
      } catch {
        if (!cancelled) setError("Couldn't load this room's history.");
      }
    };
    reloadRef.current = loadHistory;

    socket.on("connect", () => {
      socket.emit("chat:join", { roomKey });
    });

    socket.on("chat:joined", (payload) => {
      if (cancelled || payload?.roomKey !== roomKey) return;
      setStatus("ready");
      setError(null);
      loadHistory();
    });

    socket.on("chat:message", (message) => {
      if (cancelled || message?.room !== roomKey) return;
      setMessages((prev) =>
        // Dedupe by id — a reconnect can race the history refetch.
        prev.some((m) => m.id === message.id) ? prev : [...prev, message],
      );
    });

    socket.on("chat:presence", (payload) => {
      if (cancelled || payload?.roomKey !== roomKey) return;
      setPresence(payload.count ?? 0);
    });

    socket.on("chat:typing", (payload) => {
      if (cancelled) return;
      setTypingName(payload?.displayName || payload?.username || null);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTypingName(null), TYPING_CLEAR_MS);
    });

    socket.on("chat:error", (payload) => {
      if (!cancelled) setError(payload?.message || "Something went wrong.");
    });

    socket.on("connect_error", () => {
      if (!cancelled) setStatus("error");
    });

    socket.connect();

    return () => {
      cancelled = true;
      clearTimeout(typingTimer.current);
      socket.emit("chat:leave", { roomKey });
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      reloadRef.current = null;
    };
  }, [roomKey]);

  /** Re-pull history — the server decides what this reader may now see. */
  const reloadHistory = useCallback(() => reloadRef.current?.(), []);

  const send = useCallback(
    (body) => {
      const text = String(body ?? "").trim();
      if (!text || !socketRef.current) return;
      setError(null);
      socketRef.current.emit("chat:message", { roomKey, body: text });
    },
    [roomKey],
  );

  /** Throttled so a fast typist doesn't emit on every keystroke. */
  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingSent.current < 1500) return;
    lastTypingSent.current = now;
    socketRef.current?.emit("chat:typing", { roomKey });
  }, [roomKey]);

  return {
    messages,
    presence,
    typingName,
    status,
    error,
    send,
    notifyTyping,
    reloadHistory,
  };
}
