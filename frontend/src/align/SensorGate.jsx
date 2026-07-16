import { IconCompass, IconLock, IconSlash, IconAlertTriangle } from "./icons";

/**
 * The one full-screen step between "connected" and "guiding": motion-sensor
 * access. The old flow buried this as a small card below the fold — the
 * button is now the entire screen's focus (iOS requires the request to come
 * from a user gesture, so a tap is unavoidable; make it obvious instead).
 */
export default function SensorGate({ stream }) {
  const { permission, enableSensors } = stream;

  if (permission === "insecure_context") {
    return (
      <Terminal icon={<IconLock className="text-3xl text-accent-hi" />}>
        Motion sensors need a secure (HTTPS) connection. Switch the app to
        tunnel mode and scan a fresh QR code.
      </Terminal>
    );
  }

  if (permission === "unsupported") {
    return (
      <Terminal icon={<IconSlash className="text-3xl text-ink-3" />}>
        This browser doesn't expose motion sensors. Open the pairing link on a
        phone with a modern mobile browser.
      </Terminal>
    );
  }

  const denied = permission === "denied";
  const requesting = permission === "requesting";

  return (
    <div className="flex flex-1 flex-col justify-between px-6 pb-6">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div
          className={`flex h-20 w-20 items-center justify-center border ${
            denied
              ? "border-danger/30 bg-danger/10"
              : "border-accent/30 bg-accent/10"
          }`}
        >
          {denied ? (
            <IconAlertTriangle className="text-3xl text-danger" />
          ) : (
            <IconCompass className="text-3xl text-accent-hi" />
          )}
        </div>

        <h1 className="mt-7 text-2xl font-black uppercase tracking-tight">
          {denied ? "Access denied" : "One last step"}
        </h1>

        <p className="mt-3 max-w-xs text-sm leading-6 text-ink-2">
          {denied
            ? "Motion access was blocked. On iOS, allow it under Settings → Safari → Motion & Orientation Access, then try again."
            : "Your phone's compass and gyroscope become the telescope's guidance sensor. Allow motion access to start."}
        </p>
      </div>

      <button
        type="button"
        disabled={requesting}
        onClick={enableSensors}
        className="w-full bg-accent px-5 py-4 text-base font-bold uppercase tracking-wide text-ink transition-colors duration-200 hover:bg-accent-hi active:bg-accent-hi disabled:opacity-60"
      >
        {requesting
          ? "Requesting…"
          : denied
            ? "Try again"
            : "Enable motion sensors"}
      </button>
    </div>
  );
}

function Terminal({ icon, children }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
      <span>{icon}</span>
      <p className="mt-5 max-w-xs text-sm leading-6 text-ink-2">{children}</p>
    </div>
  );
}
