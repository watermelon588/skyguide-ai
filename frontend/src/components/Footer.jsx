import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUp } from "lucide-react";
import {
  FaDiscord,
  FaGithub,
  FaInstagram,
  FaLinkedin,
  FaXTwitter,
} from "react-icons/fa6";

/**
 * Site footer — the quiet last act of the landing page.
 *
 * Design-system notes (redesign v2.0): flat solid surfaces, hairlines do the
 * structuring, electric blue appears exactly where something is interactive.
 * Brand glyphs stay on react-icons (Lucide ships no brand set); every other
 * icon is Lucide.
 */

const PLATFORM_LINKS = [
  { label: "Tonight's sky", to: "/tonight" },
  { label: "Dashboard", to: "/dashboard" },
  { label: "Telescope alignment", to: "/align" },
  { label: "Sign in", to: "/login" },
];

const OVERVIEW_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
];

// Profile URLs pending — icons render as placeholders until then.
const SOCIALS = [
  { label: "GitHub", Icon: FaGithub },
  { label: "LinkedIn", Icon: FaLinkedin },
  { label: "Instagram", Icon: FaInstagram },
  { label: "Discord", Icon: FaDiscord },
  { label: "X", Icon: FaXTwitter },
];

export default function Footer() {
  const scrollToTop = () =>
    window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer
      data-reveal
      className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-10 sm:px-12"
    >
      <div className="border-t border-line pt-14">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1.4fr]">
          {/* Brand */}
          <div>
            <p className="text-2xl font-black uppercase tracking-tight text-ink">
              SkyGuide <span className="text-accent">AI</span>
            </p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-2">
              A real-time celestial recommendation and telescope alignment
              platform — your location, your telescope, tonight's sky.
            </p>
            <div className="mt-6 flex gap-2">
              {SOCIALS.map(({ label, Icon }) => (
                <span
                  key={label}
                  aria-label={label}
                  title={label}
                  className="flex h-9 w-9 cursor-pointer items-center justify-center border border-line bg-surface-2 text-base text-ink-2 transition-colors duration-300 hover:border-accent hover:text-accent"
                >
                  <Icon />
                </span>
              ))}
            </div>
          </div>

          {/* Platform */}
          <nav aria-label="Platform">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.25em] text-ink-3">
              Platform
            </h3>
            <ul className="mt-5 space-y-3 text-sm">
              {PLATFORM_LINKS.map(({ label, to }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-ink-2 transition-colors duration-300 hover:text-accent"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Overview */}
          <nav aria-label="Overview">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.25em] text-ink-3">
              Overview
            </h3>
            <ul className="mt-5 space-y-3 text-sm">
              {OVERVIEW_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <a
                    href={href}
                    className="text-ink-2 transition-colors duration-300 hover:text-accent"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Quote */}
          <blockquote className="border-l-2 border-accent bg-surface-2 p-6">
            <p className="text-sm italic leading-relaxed text-ink-2">
              "Somewhere, something incredible is waiting to be known."
            </p>
            <footer className="mt-3 text-xs text-accent">— Carl Sagan</footer>
          </blockquote>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-line pt-6 text-xs text-ink-3 sm:flex-row">
          <p>© {new Date().getFullYear()} SkyGuide AI. All rights reserved.</p>
          <p>Geometry by Astropy · Skyfield · Astroquery</p>
          <motion.button
            type="button"
            onClick={scrollToTop}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            aria-label="Back to top"
            className="flex h-10 w-10 items-center justify-center border border-line bg-surface-2 text-ink-2 transition-colors duration-300 hover:border-accent hover:text-accent"
          >
            <ArrowUp size={18} />
          </motion.button>
        </div>
      </div>
    </footer>
  );
}
