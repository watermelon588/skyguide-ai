import { Check, X, Clock } from "lucide-react";

import Avatar from "../profile/Avatar";

/**
 * Incoming chat requests (and a quiet note about outgoing ones).
 *
 * This is the consent gate made visible: nothing private exists until the
 * recipient presses Accept. Declining is silent — the sender is never told,
 * which is deliberate: a "you were rejected" notification invites retaliation.
 */
export default function PingInbox({ incoming, outgoing, onRespond, busy }) {
  if (incoming.length === 0 && outgoing.length === 0) return null;

  return (
    <div className="space-y-3">
      {incoming.length > 0 && (
        <div className="border border-accent/40 bg-accent/5 p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-accent">
            Chat requests
          </p>

          <div className="mt-3 space-y-3">
            {incoming.map((ping) => {
              const name = ping.user.displayName || ping.user.username;
              return (
                <div key={ping.id} className="flex items-start gap-3">
                  <Avatar src={ping.user.avatar} name={name} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">
                      {name}
                    </p>
                    <p className="truncate text-[11px] text-ink-3">
                      @{ping.user.username}
                    </p>
                    {ping.note && (
                      <p className="mt-1 break-words text-xs italic text-ink-2">
                        “{ping.note}”
                      </p>
                    )}

                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onRespond(ping.id, "accept")}
                        className="flex items-center gap-1.5 bg-accent px-3 py-1.5 text-[11px] font-semibold text-ink transition-colors hover:bg-accent-hi disabled:opacity-50"
                      >
                        <Check size={12} /> Accept
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onRespond(ping.id, "decline")}
                        className="flex items-center gap-1.5 border border-line bg-surface-2 px-3 py-1.5 text-[11px] font-medium text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink disabled:opacity-50"
                      >
                        <X size={12} /> Decline
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {outgoing.length > 0 && (
        <p className="flex items-center gap-1.5 px-1 text-[11px] text-ink-3">
          <Clock size={11} />
          {outgoing.length} request{outgoing.length === 1 ? "" : "s"} awaiting a
          reply
        </p>
      )}
    </div>
  );
}
