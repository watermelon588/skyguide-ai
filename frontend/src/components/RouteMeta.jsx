import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Per-route document title + scroll reset — two small things every SPA needs
 * and this one was missing (every tab read "frontend", and navigating could
 * open a page mid-scroll).
 *
 * Rendered once inside the Router. On each location change it sets a readable
 * title and returns the user to the top — of the WINDOW for public pages and of
 * the AppLayout inner scroller (`[data-scroll-root]`) for app pages, since those
 * scroll inside a flex column, not the window. A hash link scrolls to its anchor
 * instead of the top.
 */

const SUFFIX = "SkyGuide AI";

/** Longest-prefix-free exact routes; dynamic ones handled in titleFor(). */
const STATIC_TITLES = {
  "/": `${SUFFIX} — Plan tonight's sky`,
  "/login": `Sign in · ${SUFFIX}`,
  "/dashboard": `Dashboard · ${SUFFIX}`,
  "/alignment": `Alignment · ${SUFFIX}`,
  "/tonight": `Tonight · ${SUFFIX}`,
  "/explore": `Explore the catalog · ${SUFFIX}`,
  "/profile": `Your profile · ${SUFFIX}`,
  "/community": `Community · ${SUFFIX}`,
  "/community/chat": `Community chat · ${SUFFIX}`,
  "/guide": `First Light Guide · ${SUFFIX}`,
  "/privacy": `Privacy Policy · ${SUFFIX}`,
  "/forgot-password": `Reset password · ${SUFFIX}`,
  "/reset-password": `Reset password · ${SUFFIX}`,
  "/verify-email": `Verify email · ${SUFFIX}`,
};

/** Second path segment, decoded — the dynamic id/username. */
function segment(pathname) {
  const raw = pathname.split("/")[2];
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function titleFor(pathname) {
  if (STATIC_TITLES[pathname]) return STATIC_TITLES[pathname];
  if (pathname.startsWith("/tonight/")) {
    const id = segment(pathname);
    return id ? `${id} · ${SUFFIX}` : `Tonight · ${SUFFIX}`;
  }
  if (pathname.startsWith("/reset-password/")) return `Reset password · ${SUFFIX}`;
  if (pathname.startsWith("/verify-email/")) return `Verify email · ${SUFFIX}`;
  if (pathname.startsWith("/observers/")) {
    const username = segment(pathname);
    return username ? `@${username} · ${SUFFIX}` : SUFFIX;
  }
  return SUFFIX;
}

export default function RouteMeta() {
  const location = useLocation();

  useEffect(() => {
    document.title = titleFor(location.pathname);

    // Hash link: let the anchor win.
    if (location.hash) {
      const el = document.getElementById(location.hash.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }

    // Otherwise return to the top of whichever surface actually scrolls.
    window.scrollTo(0, 0);
    document.querySelectorAll("[data-scroll-root]").forEach((el) => {
      el.scrollTop = 0;
    });
  }, [location.pathname, location.hash]);

  return null;
}
