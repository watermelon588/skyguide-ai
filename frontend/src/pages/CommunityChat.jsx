import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MessageSquare, Users, AlertCircle, ArrowLeft } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import RoomSwitcher from "../components/community/RoomSwitcher";
import MessageList from "../components/community/MessageList";
import MessageComposer from "../components/community/MessageComposer";
import PingInbox from "../components/community/PingInbox";
import { useRooms } from "../hooks/useRooms";
import { useChatRoom } from "../hooks/useChatRoom";
import { usePings } from "../hooks/usePings";
import { useAuth } from "../context/AuthContext";
import {
  blockObserver,
  reportMessage,
} from "../services/community.service";

/**
 * /community/chat — regional + global chat rooms (Feature 6b).
 *
 * Two panes: the room switcher and the active room. Live traffic runs over the
 * "/community" socket namespace; history comes over REST. Renders inside
 * AppLayout, so it inherits the app navbar.
 */
export default function CommunityChat() {
  const { rooms, isLoading, isError } = useRooms();
  const { incoming, outgoing, respond } = usePings();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedKey, setSelectedKey] = useState(null);
  const [notice, setNotice] = useState(null);
  const [searchParams] = useSearchParams();

  // A `?room=` deep-link (from a message/ping-accepted notification) opens that
  // conversation directly. It only seeds the initial room — once the observer
  // clicks another, `selectedKey` overrides it.
  const roomParam = searchParams.get("room");

  // Default to the observer's regional room when they have one — it's the more
  // useful room ("is it clear over the river?") — else the first available.
  // Derived rather than synced via an effect: the default falls out of `rooms`,
  // and an explicit pick simply overrides it.
  const defaultKey =
    rooms.find((r) => r.kind === "region")?.key ?? rooms[0]?.key ?? null;
  const activeKey = selectedKey ?? roomParam ?? defaultKey;

  const {
    messages,
    presence,
    typingName,
    status,
    error,
    send,
    notifyTyping,
    reloadHistory,
  } = useChatRoom(activeKey);

  const activeRoom = rooms.find((r) => r.key === activeKey) ?? null;
  const hasRegion = rooms.some((r) => r.kind === "region");

  const onReport = async (message) => {
    try {
      await reportMessage(message.id, "inappropriate");
      setNotice("Reported. Thanks — we'll take a look.");
    } catch (err) {
      setNotice(err?.response?.data?.message || "Couldn't report that message.");
    }
  };

  const onBlock = async (author) => {
    try {
      await blockObserver(author.username);
      setNotice(`Blocked @${author.username}. You won't see each other again.`);
      // Blocking rewrites what the server will show this reader, so re-pull
      // rather than patching locally — and drop any shared private room.
      reloadHistory();
      queryClient.invalidateQueries({ queryKey: ["community", "rooms"] });
      queryClient.invalidateQueries({ queryKey: ["community", "nearby"] });
    } catch (err) {
      setNotice(err?.response?.data?.message || "Couldn't block that observer.");
    }
  };

  if (isError) {
    return (
      <div className="mx-auto w-full max-w-2xl px-6 py-16 text-center">
        <p className="border border-danger/30 bg-danger/10 px-5 py-4 text-sm text-danger">
          Couldn't load your rooms — check the gateway and reload.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/community"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-ink-3 transition-colors hover:text-accent"
        >
          <ArrowLeft size={14} /> Observers nearby
        </Link>
        <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-accent">
          Community
        </p>
        <h1 className="mt-1 flex items-center gap-2.5 text-3xl font-bold text-ink">
          <MessageSquare size={26} className="text-accent" />
          Rooms
        </h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        {/* Rooms */}
        <aside className="space-y-3">
          <PingInbox
            incoming={incoming}
            outgoing={outgoing}
            busy={respond.isPending}
            onRespond={(id, action) => respond.mutate({ id, action })}
          />

          {isLoading ? (
            <div className="h-40 animate-pulse border border-line bg-surface-2" />
          ) : rooms.length === 0 ? (
            <div className="border border-line bg-surface-2 p-4">
              <p className="text-xs leading-relaxed text-ink-3">
                No rooms yet. Set your location for a regional room, or ping an
                observer to start a private conversation.
              </p>
            </div>
          ) : (
            <RoomSwitcher
              rooms={rooms}
              activeKey={activeKey}
              onSelect={setSelectedKey}
            />
          )}

          {!isLoading && !hasRegion && (
            <div className="border border-line bg-surface-2 p-4">
              <p className="text-xs leading-relaxed text-ink-3">
                Set your observing location to unlock your regional room —
                the people who actually share your sky.
              </p>
              <Link
                to="/dashboard"
                className="mt-3 inline-block bg-accent px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-accent-hi"
              >
                Set location
              </Link>
            </div>
          )}
        </aside>

        {/* Active room */}
        <section className="flex h-[min(68vh,620px)] flex-col border border-line bg-surface-2">
          {/* Room header */}
          <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">
                {activeRoom?.name ?? "Select a room"}
              </p>
              {typingName ? (
                <p className="text-[11px] text-accent">{typingName} is typing…</p>
              ) : (
                <p className="text-[11px] text-ink-3">
                  {status === "ready"
                    ? "Connected"
                    : status === "error"
                      ? "Disconnected"
                      : "Connecting…"}
                </p>
              )}
            </div>
            <span className="flex shrink-0 items-center gap-1.5 border border-line bg-surface-3 px-2.5 py-1 text-[11px] text-ink-2">
              <Users size={12} className="text-accent" />
              {presence} observing
            </span>
          </div>

          {error && (
            <p className="flex items-center gap-2 border-b border-danger/30 bg-danger/10 px-5 py-2.5 text-xs text-danger">
              <AlertCircle size={13} /> {error}
            </p>
          )}

          {notice && (
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="border-b border-line bg-surface-3 px-5 py-2.5 text-left text-xs text-ink-2"
            >
              {notice} <span className="text-ink-3">(dismiss)</span>
            </button>
          )}

          <MessageList
            messages={messages}
            currentUsername={user?.username}
            onReport={onReport}
            onBlock={onBlock}
            emptyHint={
              status === "ready"
                ? activeRoom?.kind === "direct"
                  ? "This conversation is just the two of you. Say hello."
                  : "No messages yet — say hello and start the night off."
                : "Connecting to the room…"
            }
          />

          <MessageComposer
            onSend={send}
            onTyping={notifyTyping}
            disabled={status !== "ready"}
          />
        </section>
      </div>
    </div>
  );
}
