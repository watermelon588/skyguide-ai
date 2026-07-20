import { useCallback, useEffect, useState } from "react";

/**
 * "Install the companion" state for align.html.
 *
 * Chromium fires `beforeinstallprompt` when the manifest qualifies — we stash
 * the event and replay it from a button tap. iOS never fires it (install is
 * only via Share → Add to Home Screen), so callers get `isIOS` to show
 * instructions instead. Inside the installed app (standalone display mode)
 * everything reports false and no banner renders.
 */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(false);

  const standalone =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)").matches ||
      window.navigator.standalone === true);

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice?.outcome === "accepted") setInstalled(true);
    setDeferred(null); // the event is single-use either way
  }, [deferred]);

  const isIOS =
    typeof navigator !== "undefined" &&
    /iphone|ipad|ipod/i.test(navigator.userAgent);

  return {
    canPrompt: Boolean(deferred),
    install,
    installed,
    standalone,
    isIOS,
  };
}
