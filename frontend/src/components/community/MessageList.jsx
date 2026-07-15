import { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { Flag, Ban } from "lucide-react";

import Avatar from "../profile/Avatar";

/**
 * The message stream: sided bubbles, day dividers, and consecutive-message
 * grouping (the same author within 5 minutes drops the repeated header, so a
 * burst reads as one thought rather than a wall of name tags).
 *
 * SIDES — the reader's own messages sit on the RIGHT, everyone else's on the
 * LEFT (the familiar WhatsApp/iMessage convention). The side is derived per
 * message from `isMine`, so a grouped run of consecutive messages always stays
 * on its author's side. It lives in one constant: flip SELF_SIDE to swap the
 * whole layout.
 *
 * Auto-scrolls to the newest message only when the reader is already near the
 * bottom — scrolling someone away from history they're reading is worse than
 * missing a scroll.
 */

const GROUP_WINDOW_MS = 5 * 60 * 1000;

/** Which side the signed-in observer's own messages sit on. */
const SELF_SIDE = "right";

function dayLabel(date) {
  const today = new Date();
  const d = new Date(date);
  const sameDay = (a, b) => a.toDateString() === b.toDateString();

  if (sameDay(d, today)) return "Today";

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(d, yesterday)) return "Yesterday";

  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

const timeLabel = (date) =>
  new Date(date).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

export default function MessageList({
  messages,
  emptyHint,
  currentUsername,
  onReport,
  onBlock,
}) {
  const endRef = useRef(null);
  const scrollerRef = useRef(null);
  const pinnedToBottom = useRef(true);

  // Day dividers and grouping depend on each message's PREDECESSOR, so decide
  // them in one pass up front rather than tracking cursors during render.
  const rows = useMemo(
    () =>
      messages.map((message, i) => {
        // Compare against the predecessor directly — no running cursor to
        // mutate, so this stays a pure derivation of `messages`.
        const prev = i > 0 ? messages[i - 1] : null;
        const day = dayLabel(message.createdAt);
        const showDay = !prev || dayLabel(prev.createdAt) !== day;
        const grouped =
          Boolean(prev) &&
          !showDay &&
          prev.author.username === message.author.username &&
          new Date(message.createdAt) - new Date(prev.createdAt) <
            GROUP_WINDOW_MS;

        return { message, day, showDay, grouped };
      }),
    [messages],
  );

  // Track whether the reader is at the bottom BEFORE the next render appends.
  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    pinnedToBottom.current = distance < 120;
  };

  useEffect(() => {
    if (pinnedToBottom.current) {
      endRef.current?.scrollIntoView({ block: "end" });
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-16 text-center">
        <p className="max-w-sm text-sm leading-relaxed text-ink-3">{emptyHint}</p>
      </div>
    );
  }

  return (
    <div
      ref={scrollerRef}
      onScroll={onScroll}
      className="flex-1 overflow-y-auto px-5 py-4"
    >
      {rows.map(({ message, day, showDay, grouped }) => {
        const name = message.author.displayName || message.author.username;
        const isMine = message.author.username === currentUsername;
        const onLeft = isMine === (SELF_SIDE === "left");

        return (
          <div key={message.id}>
            {showDay && (
              <div className="my-4 flex items-center gap-3">
                <span className="h-px flex-1 bg-line" />
                <span className="text-[11px] uppercase tracking-[0.2em] text-ink-3">
                  {day}
                </span>
                <span className="h-px flex-1 bg-line" />
              </div>
            )}

            <div
              className={`group flex gap-3 ${grouped ? "mt-0.5" : "mt-3"} ${
                onLeft ? "flex-row" : "flex-row-reverse"
              }`}
            >
              {/* Avatar column — always on the message's own side. */}
              <div className="w-8 shrink-0">
                {!grouped && (
                  <Avatar src={message.author.avatar} name={name} size={32} />
                )}
              </div>

              <div
                className={`flex min-w-0 max-w-[75%] flex-col ${
                  onLeft ? "items-start" : "items-end"
                }`}
              >
                {!grouped && (
                  <div
                    className={`flex items-baseline gap-2 ${
                      onLeft ? "" : "flex-row-reverse"
                    }`}
                  >
                    <Link
                      to={`/observers/${message.author.username}`}
                      className="text-sm font-semibold text-ink transition-colors hover:text-accent"
                    >
                      {isMine ? "You" : name}
                    </Link>
                    <span className="text-[11px] text-ink-3">
                      {timeLabel(message.createdAt)}
                    </span>
                  </div>
                )}

                <p
                  className={`mt-1 whitespace-pre-wrap break-words border px-3 py-2 text-sm leading-relaxed ${
                    isMine
                      ? "border-accent/40 bg-accent/15 text-ink"
                      : "border-line bg-surface-3 text-ink-2"
                  }`}
                >
                  {message.body}
                </p>
              </div>

              {/* Safety actions — never on your own messages. Revealed on
                  hover/focus so the stream stays calm until you need them. */}
              {!isMine && (
                <div className="flex shrink-0 items-start gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                  <button
                    type="button"
                    title="Report this message"
                    aria-label={`Report message from ${name}`}
                    onClick={() => onReport?.(message)}
                    className="p-1 text-ink-3 transition-colors hover:text-warning"
                  >
                    <Flag size={12} />
                  </button>
                  <button
                    type="button"
                    title={`Block ${name}`}
                    aria-label={`Block ${name}`}
                    onClick={() => onBlock?.(message.author)}
                    className="p-1 text-ink-3 transition-colors hover:text-danger"
                  >
                    <Ban size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
