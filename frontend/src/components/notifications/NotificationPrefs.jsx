import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  fetchNotificationPrefs,
  updateNotificationPrefs,
} from "../../services/notification.service";

/**
 * Notification settings, for the profile page.
 *
 * Every control saves immediately — these are switches, not a form, so a Save
 * button would only add a step. The digest hour is in the observer's OWN
 * timezone; the cron converts, so "17:00" means 17:00 where they observe.
 */

const KEY = ["notifications", "prefs"];

const TOGGLES = [
  {
    key: "digest",
    label: "Nightly sky digest",
    hint: "Tonight's score, moon, and top targets.",
  },
  {
    key: "email",
    label: "Send digests by email",
    hint: "Off = in-app only. Notifications still appear in the bell.",
  },
  {
    key: "greatNight",
    label: "Great-night alerts",
    hint: "When tonight scores 75+.",
  },
  {
    key: "issAlerts",
    label: "ISS pass alerts",
    hint: "Bright passes overhead.",
  },
];

export default function NotificationPrefs({ timezone }) {
  const queryClient = useQueryClient();

  const query = useQuery({ queryKey: KEY, queryFn: fetchNotificationPrefs });
  const prefs = query.data?.notificationPrefs ?? null;

  const save = useMutation({
    mutationFn: updateNotificationPrefs,
    // Optimistic — a switch that lags feels broken.
    onMutate: async (changes) => {
      await queryClient.cancelQueries({ queryKey: KEY });
      const prev = queryClient.getQueryData(KEY);
      queryClient.setQueryData(KEY, (old) =>
        old
          ? { notificationPrefs: { ...old.notificationPrefs, ...changes } }
          : old,
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => queryClient.setQueryData(KEY, ctx?.prev),
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });

  if (query.isLoading || !prefs) {
    return <div className="h-40 animate-pulse border border-line bg-surface-2" />;
  }

  return (
    <section className="space-y-4 border border-line bg-surface-2 p-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-accent">
          Notifications
        </p>
        {query.isError && (
          <p className="mt-2 text-xs text-danger">
            Couldn't load your settings — changes may not save.
          </p>
        )}
      </div>

      {TOGGLES.map((t) => (
        <label
          key={t.key}
          className="flex cursor-pointer items-center justify-between gap-4 border border-line bg-surface-3 px-4 py-3"
        >
          <span>
            <span className="block text-sm font-medium text-ink">{t.label}</span>
            <span className="block text-xs text-ink-3">{t.hint}</span>
          </span>
          <input
            type="checkbox"
            checked={Boolean(prefs[t.key])}
            onChange={(e) => save.mutate({ [t.key]: e.target.checked })}
            className="h-4 w-4 shrink-0 accent-[#0049CD]"
          />
        </label>
      ))}

      <div className="flex items-center justify-between gap-4 border border-line bg-surface-3 px-4 py-3">
        <span>
          <span className="block text-sm font-medium text-ink">
            Digest time
          </span>
          <span className="block text-xs text-ink-3">
            Your local time{timezone ? ` (${timezone})` : ""} — usually best
            before dusk.
          </span>
        </span>
        <select
          value={prefs.digestHourLocal ?? 17}
          onChange={(e) => save.mutate({ digestHourLocal: Number(e.target.value) })}
          disabled={!prefs.digest}
          aria-label="Digest hour"
          className="shrink-0 border border-line bg-surface-2 px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-accent disabled:opacity-40"
        >
          {Array.from({ length: 24 }, (_, h) => (
            <option key={h} value={h}>
              {String(h).padStart(2, "0")}:00
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}
