import { useEffect } from "react";

/**
 * Legacy /align route — the phone companion now lives in its own lightweight
 * entry (/align.html, see src/align/) so phones stop downloading the whole
 * SPA. QR codes printed/scanned before that change still land here; forward
 * them with the pairing params intact.
 */
export default function Align() {
  useEffect(() => {
    window.location.replace(`/align.html${window.location.search}`);
  }, []);

  return null;
}
