const TONES = {
  connected: { dot: "bg-success", text: "text-success", ping: true },
  waiting: { dot: "bg-accent", text: "text-ink-2", ping: true },
  connecting: { dot: "bg-accent", text: "text-ink-2", ping: true },
  error: { dot: "bg-danger", text: "text-danger", ping: false },
  idle: { dot: "bg-ink-4", text: "text-ink-3", ping: false },
};

/**
 * Small animated status dot + label, shared by the dashboard modal and the
 * phone pairing page so both speak the same visual language.
 *
 * @param {"connected"|"waiting"|"connecting"|"error"|"idle"} tone
 * @param {string} label
 */
export default function ConnectionIndicator({ tone = "idle", label }) {
  const t = TONES[tone] ?? TONES.idle;

  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span className="relative flex h-2.5 w-2.5">
        {t.ping && (
          <span
            className={`absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full opacity-70 ${t.dot}`}
          />
        )}
        <span className={`inline-flex h-2.5 w-2.5 rounded-full ${t.dot}`} />
      </span>
      <span className={t.text}>{label}</span>
    </span>
  );
}
