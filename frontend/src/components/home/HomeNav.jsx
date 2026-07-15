import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
} from "framer-motion";
import { Menu, X } from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import MagneticButton from "../fx/MagneticButton";

/**
 * Landing-page navigation — a collapsible, interactive bar.
 *
 * Flat black, radius-0, hairline underline, electric-blue accent. It hides on
 * scroll-down and re-reveals on scroll-up (Framer Motion), turns solid once you
 * leave the hero, and opens a full-screen overlay menu on mobile. Auth-aware:
 * visitors get "Sign in", observers go straight to the app. Behaviour (routes,
 * auth branch) is unchanged from the previous version.
 */
export default function HomeNav() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setHidden(y > prev && y > 160 && !open); // hide going down, past the hero
    setSolid(y > 40);
  });

  const anchors = [
    { label: "Features", href: "#features" },
    { label: "How it works", href: "#how-it-works" },
    { label: "Guide", href: "/guide" },
  ];

  return (
    <>
      <motion.nav
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: hidden ? "-110%" : 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed inset-x-0 top-0 z-40 border-b transition-colors duration-300 ${
          solid
            ? "border-line bg-black/95"
            : "border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link
            to="/"
            className="text-lg font-black uppercase tracking-tight text-ink"
          >
            SkyGuide <span className="text-accent">AI</span>
          </Link>

          <div className="hidden items-center gap-9 text-sm font-medium text-ink-2 md:flex">
            {anchors.map(({ label, href }) => (
              <a
                key={href}
                href={href}
                className="group relative py-1 transition-colors duration-300 hover:text-ink"
              >
                {label}
                <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-accent transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <MagneticButton
                onClick={() => navigate("/dashboard")}
                className="hidden bg-accent px-5 py-2.5 text-sm font-semibold text-ink transition-colors duration-300 hover:bg-accent-hi sm:inline-flex"
              >
                Open Dashboard
              </MagneticButton>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="hidden px-3 py-2 text-sm font-medium text-ink-2 transition-colors duration-300 hover:text-ink sm:block"
                >
                  Sign in
                </button>
                <MagneticButton
                  onClick={() => navigate("/login")}
                  className="hidden bg-accent px-5 py-2.5 text-sm font-semibold text-ink transition-colors duration-300 hover:bg-accent-hi sm:inline-flex"
                >
                  Get started
                </MagneticButton>
              </>
            )}
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setOpen(true)}
              className="flex h-10 w-10 items-center justify-center border border-line text-ink md:hidden"
            >
              <Menu size={18} />
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile full-screen overlay menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex flex-col bg-black md:hidden"
          >
            <div className="flex h-16 items-center justify-between border-b border-line px-5">
              <span className="text-lg font-black uppercase tracking-tight text-ink">
                SkyGuide <span className="text-accent">AI</span>
              </span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center border border-line text-ink"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-1 flex-col justify-center gap-2 px-6">
              {anchors.map(({ label, href }, i) => (
                <motion.a
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.06 * i + 0.1 }}
                  className="border-b border-line py-5 text-3xl font-bold text-ink"
                >
                  {label}
                </motion.a>
              ))}
              <motion.button
                type="button"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                onClick={() => {
                  setOpen(false);
                  navigate(isAuthenticated ? "/dashboard" : "/login");
                }}
                className="mt-8 bg-accent px-6 py-4 text-base font-semibold text-ink transition-colors hover:bg-accent-hi"
              >
                {isAuthenticated ? "Open Dashboard" : "Get started"}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
