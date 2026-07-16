import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Menu, X, Sparkles } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import Avatar from "./profile/Avatar";
import NotificationBell from "./notifications/NotificationBell";

/**
 * The one navbar, shared by every page (app pages AND the immersive /tonight
 * and /guide, so the whole product reads as one shell).
 *
 * Two responsibilities that used to be scattered:
 *  - Auth-aware: the links are always shown, but the bell + avatar appear only
 *    when signed in; signed-out visitors get a "Sign in" button. That's what
 *    lets the public pages (/tonight, /guide, /) wear the same bar safely.
 *  - Responsive: below `md` the links collapse into a hamburger sheet. The
 *    floating Astro chat is hidden on phones (it overlaps content), so the
 *    sheet carries an "Ask Astro" entry that opens the same assistant.
 */

const LINKS = [
  { label: "Home", to: "/" },
  { label: "Dashboard", to: "/dashboard" },
  { label: "Tonight", to: "/tonight" },
  { label: "Explore", to: "/explore" },
  { label: "Community", to: "/community" },
  { label: "Guide", to: "/guide" },
];

const linkClass = ({ isActive }) =>
  `transition-colors hover:text-accent ${isActive ? "text-accent" : "text-ink-2"}`;

export const Navbar = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { openChat } = useChat();
  const [menuOpen, setMenuOpen] = useState(false);

  // Lock body scroll while the mobile sheet is open.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const close = () => setMenuOpen(false);
  const go = (to) => {
    close();
    navigate(to);
  };
  const askAstro = () => {
    close();
    openChat();
  };

  return (
    <header className="relative z-40 border-b border-line bg-bg/95">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-12 lg:py-6">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="text-xl font-black uppercase tracking-tight text-ink sm:text-2xl"
        >
          SkyGuide <span className="text-accent">AI</span>
        </button>

        {/* Desktop links */}
        <ul className="hidden items-center gap-8 text-sm font-medium lg:flex">
          {LINKS.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} className={linkClass} end={item.to === "/"}>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Desktop right cluster */}
        <div className="hidden items-center gap-5 lg:flex">
          {isAuthenticated ? (
            <>
              <NotificationBell />
              <button
                type="button"
                onClick={() => navigate("/profile")}
                aria-label="Your profile"
                className="transition hover:opacity-80"
              >
                <Avatar
                  src={user?.avatar}
                  name={user?.displayName || user?.username}
                  size={32}
                />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="bg-accent px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-accent-hi"
            >
              Sign in
            </button>
          )}
        </div>

        {/* Mobile: bell (if authed) + hamburger */}
        <div className="flex items-center gap-3 lg:hidden">
          {isAuthenticated && <NotificationBell />}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="flex h-9 w-9 items-center justify-center border border-line bg-surface-2 text-ink-2 transition-colors hover:text-accent"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {/* Mobile sheet */}
      {menuOpen && (
        <div className="lg:hidden">
          <div className="border-t border-line bg-bg px-5 py-4 sm:px-8">
            <ul className="flex flex-col">
              {LINKS.map((item) => (
                <li key={item.to} className="border-b border-line last:border-b-0">
                  <NavLink
                    to={item.to}
                    end={item.to === "/"}
                    onClick={close}
                    className={({ isActive }) =>
                      `block py-3 text-base font-medium transition-colors ${
                        isActive ? "text-accent" : "text-ink"
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-col gap-3">
              {/* Astro is hidden as a floating widget on phones; reach it here. */}
              <button
                type="button"
                onClick={askAstro}
                className="flex items-center justify-center gap-2 border border-line bg-surface-2 py-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-3 hover:text-accent"
              >
                <Sparkles size={16} /> Ask Astro
              </button>

              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => go("/profile")}
                  className="flex items-center justify-center gap-2 py-2 text-sm text-ink-2 transition-colors hover:text-accent"
                >
                  <Avatar
                    src={user?.avatar}
                    name={user?.displayName || user?.username}
                    size={24}
                  />
                  Your profile
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => go("/login")}
                  className="bg-accent py-3 text-sm font-semibold text-ink transition-colors hover:bg-accent-hi"
                >
                  Sign in
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
