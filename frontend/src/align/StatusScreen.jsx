import {
  IconSmartphone,
  IconCheckCircle,
  IconAlertTriangle,
  IconRefresh,
  IconCamera,
} from "./icons";

/**
 * Full-screen connection states for the companion. Presentational only —
 * maps pairing.status (plus the "invalid" QR case) to icon + title + body.
 * CSS transitions only; the companion bundle carries no motion library.
 */
export default function StatusScreen({ kind, error }) {
  const view = VIEWS[kind] ?? VIEWS.connecting;

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
      <div
        className={`flex h-20 w-20 items-center justify-center border ${view.ring}`}
      >
        <span className={view.spin ? "animate-spin" : ""}>{view.icon}</span>
      </div>

      <h1 className="mt-7 text-2xl font-black uppercase tracking-tight">
        {view.title}
      </h1>

      <p className="mt-3 max-w-xs text-sm leading-6 text-ink-2">
        {kind === "error" && error ? error : view.body}
      </p>

      {view.hint && (
        <p className="mt-6 border border-line bg-surface-2 px-4 py-3 text-xs leading-5 text-ink-3">
          {view.hint}
        </p>
      )}
    </div>
  );
}

const VIEWS = {
  invalid: {
    icon: <IconCamera className="text-3xl text-accent-hi" />,
    ring: "border-accent/30 bg-accent/10",
    title: "Scan to pair",
    body: "This page needs a pairing session from your dashboard.",
    hint: "On your computer: open SkyGuide → Sync telescope → scan the QR code with your phone's camera.",
  },
  idle: {
    icon: <IconSmartphone className="text-3xl text-accent-hi" />,
    ring: "border-accent/30 bg-accent/10",
    title: "Preparing",
    body: "Getting things ready.",
  },
  connecting: {
    icon: <IconRefresh className="text-3xl text-accent-hi" />,
    spin: true,
    ring: "border-accent/30 bg-accent/10",
    title: "Connecting",
    body: "Establishing a secure connection to your dashboard.",
  },
  authenticating: {
    icon: <IconRefresh className="text-3xl text-accent-hi" />,
    spin: true,
    ring: "border-accent/30 bg-accent/10",
    title: "Authenticating",
    body: "Confirming your pairing session with the server.",
  },
  connected: {
    icon: <IconCheckCircle className="text-3xl text-success" />,
    ring: "border-success/30 bg-success/10",
    title: "Connected",
    body: "Paired with your dashboard.",
  },
  disconnected: {
    icon: <IconRefresh className="text-3xl text-accent-hi" />,
    spin: true,
    ring: "border-accent/30 bg-accent/10",
    title: "Reconnecting",
    body: "Connection lost — trying to restore it. Keep this screen open.",
  },
  error: {
    icon: <IconAlertTriangle className="text-3xl text-danger" />,
    ring: "border-danger/30 bg-danger/10",
    title: "Session expired",
    body: "This pairing session is invalid or has expired.",
    hint: "Open Sync telescope on your dashboard and scan a fresh QR code.",
  },
  terminated: {
    icon: <IconAlertTriangle className="text-3xl text-danger" />,
    ring: "border-danger/30 bg-danger/10",
    title: "Session ended",
    body: "The dashboard disconnected this device.",
    hint: "To pair again, generate a new QR code from your dashboard.",
  },
};
