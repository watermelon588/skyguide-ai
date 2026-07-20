import { createRoot } from "react-dom/client";
import "../index.css";
import { SocketProvider } from "../context/SocketContext.jsx";
import CompanionApp from "./CompanionApp.jsx";
import { applyBrandFavicon } from "../config/brand";

/**
 * SkyGuide Companion entry (align.html) — a separate Vite input from the SPA.
 *
 * Deliberately mounts NO router, auth, query client, chat or motion library:
 * the phone at the telescope needs pairing + sensors + guidance and nothing
 * else. Everything session-shaped it does reuse (PairingContext, the
 * orientation stream, socket.service) is shared with the main app.
 */
// Same single brand source as the main app (see config/brand.js).
applyBrandFavicon();

createRoot(document.getElementById("root")).render(
  <SocketProvider>
    <CompanionApp />
  </SocketProvider>,
);
