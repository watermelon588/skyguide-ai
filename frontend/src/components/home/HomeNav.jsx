import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import { useAuth } from "../../context/AuthContext";

/**
 * Landing-page navigation — a floating glass bar that fades down on mount.
 * Auth-aware: visitors get "Sign in", observers get straight to the app.
 */
export default function HomeNav() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const anchors = [
    { label: "Features", href: "#features" },
    { label: "How it works", href: "#how-it-works" },
  ];

  return (
    <motion.nav
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="fixed inset-x-0 top-0 z-30 px-4 pt-4 sm:px-8"
    >
      <div className="mx-auto flex h-[64px] w-full max-w-6xl items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 shadow-2xl backdrop-blur-3xl sm:px-7">
        <Link to="/" className="text-lg font-bold tracking-wide text-white">
          SkyGuide <span className="text-[#FF8C1A]">AI</span>
        </Link>

        <div className="hidden items-center gap-8 text-sm font-medium text-[#AAB4C5] md:flex">
          {anchors.map(({ label, href }) => (
            <a
              key={href}
              href={href}
              className="group relative transition-colors duration-300 hover:text-white"
            >
              {label}
              <span className="absolute -bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 scale-0 rounded-full bg-[#FF8C1A] transition-transform duration-300 group-hover:scale-100" />
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/dashboard")}
              className="rounded-xl bg-[#FF8C1A] px-5 py-2 text-sm font-semibold text-[#090B10] transition-colors duration-300 hover:bg-[#FF6B00]"
            >
              Open Dashboard
            </motion.button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="hidden rounded-xl px-4 py-2 text-sm font-medium text-[#AAB4C5] transition-colors duration-300 hover:text-white sm:block"
              >
                Sign in
              </button>
              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/login")}
                className="rounded-xl bg-[#FF8C1A] px-5 py-2 text-sm font-semibold text-[#090B10] transition-colors duration-300 hover:bg-[#FF6B00]"
              >
                Get started
              </motion.button>
            </>
          )}
        </div>
      </div>
    </motion.nav>
  );
}
