import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Check } from "lucide-react";

import { useNotifications } from "../../hooks/useNotifications";

/**
 * The navbar bell: unread badge + a flat dropdown of recent notifications.
 *
 * Deliberately not a route — a notification is a nudge toward somewhere else,
 * so opening one marks it read and navigates to its `data.href`. The list is
 * live (see useNotifications), so the badge moves without a refresh.
 */

/** "3m", "2h", "5d" — compact enough for a dropdown row. */
function ago(iso) {
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
  return `${Math.floor(secs / 86400)}d`;
}

export default function NotificationBell() {
  const { notifications, unread, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const navigate = useNavigate();

  // Close on outside click / Escape — a dropdown that traps you is worse than
  // no dropdown.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onOpenNotification = (n) => {
    if (!n.read) markRead.mutate(n.id);
    setOpen(false);
    if (n.data?.href) navigate(n.data.href);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
        aria-expanded={open}
        className="relative flex h-8 w-8 items-center justify-center text-ink-2 transition-colors hover:text-accent"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center bg-accent px-1 text-[10px] font-bold text-ink">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-11 z-50 w-80 border border-line bg-surface-1"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-accent">
                Notifications
              </p>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={() => markAllRead.mutate()}
                  className="flex items-center gap-1 text-[11px] text-ink-3 transition-colors hover:text-ink"
                >
                  <Check size={11} /> Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs leading-relaxed text-ink-3">
                  Nothing yet. Your nightly sky digest will land here.
                </p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => onOpenNotification(n)}
                    className={`flex w-full gap-3 border-b border-line px-4 py-3 text-left transition-colors hover:bg-surface-3 ${
                      n.read ? "bg-surface-1" : "bg-surface-2"
                    }`}
                  >
                    {/* Unread marker — a dot carries this better than bold text. */}
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 shrink-0 ${
                        n.read ? "bg-transparent" : "bg-accent"
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-ink">
                          {n.title}
                        </span>
                        <span className="shrink-0 text-[10px] text-ink-3">
                          {ago(n.createdAt)}
                        </span>
                      </span>
                      <span className="mt-0.5 block line-clamp-2 text-xs leading-relaxed text-ink-2">
                        {n.body}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
