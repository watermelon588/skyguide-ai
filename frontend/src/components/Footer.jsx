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
 * Design-system notes: glass only on the quote card, hairlines do the
 * structuring, orange appears exactly where something is interactive.
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
      <div className="border-t border-white/10 pt-14">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1.4fr]">
          {/* Brand */}
          <div>
            <p className="text-2xl font-bold text-white">
              SkyGuide <span className="text-[#FF8C1A]">AI</span>
            </p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-[#AAB4C5]">
              A real-time celestial recommendation and telescope alignment
              platform — your location, your telescope, tonight's sky.
            </p>
            <div className="mt-6 flex gap-2">
              {SOCIALS.map(({ label, Icon }) => (
                <span
                  key={label}
                  aria-label={label}
                  title={label}
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/5 text-base text-[#AAB4C5] transition-colors duration-300 hover:border-[#FF8C1A]/40 hover:text-[#FF8C1A]"
                >
                  <Icon />
                </span>
              ))}
            </div>
          </div>

          {/* Platform */}
          <nav aria-label="Platform">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.25em] text-[#6B7280]">
              Platform
            </h3>
            <ul className="mt-5 space-y-3 text-sm">
              {PLATFORM_LINKS.map(({ label, to }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-[#AAB4C5] transition-colors duration-300 hover:text-[#FF8C1A]"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Overview */}
          <nav aria-label="Overview">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.25em] text-[#6B7280]">
              Overview
            </h3>
            <ul className="mt-5 space-y-3 text-sm">
              {OVERVIEW_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <a
                    href={href}
                    className="text-[#AAB4C5] transition-colors duration-300 hover:text-[#FF8C1A]"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Quote */}
          <blockquote className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-3xl">
            <p className="text-sm italic leading-relaxed text-[#AAB4C5]">
              "Somewhere, something incredible is waiting to be known."
            </p>
            <footer className="mt-3 text-xs text-[#FF8C1A]">
              — Carl Sagan
            </footer>
          </blockquote>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-[#6B7280] sm:flex-row">
          <p>© {new Date().getFullYear()} SkyGuide AI. All rights reserved.</p>
          <p>Geometry by Astropy · Skyfield · Astroquery</p>
          <motion.button
            type="button"
            onClick={scrollToTop}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            aria-label="Back to top"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[#AAB4C5] backdrop-blur-3xl transition-colors duration-300 hover:border-[#FF8C1A]/40 hover:text-[#FF8C1A]"
          >
            <ArrowUp size={18} />
          </motion.button>
        </div>
      </div>
    </footer>
  );
}
