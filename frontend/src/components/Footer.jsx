import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUp, Mail } from "lucide-react";
import {
  FaDiscord,
  FaGithub,
  FaInstagram,
  FaLinkedin,
  FaXTwitter,
} from "react-icons/fa6";

import FooterFeedback from "./FooterFeedback";
import Logo from "./brand/Logo";
import { BRAND_FULL_NAME } from "../config/brand";
import { useToast } from "../context/ToastContext";

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
  { label: "Telescope alignment", to: "/alignment" },
  { label: "Sign in", to: "/login" },
];

const OVERVIEW_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Privacy", to: "/privacy" },
];

// Link-out socials. Discord is handled separately (no per-username profile
// URL exists — clicking copies the handle instead).
const SOCIALS = [
  { label: "GitHub", Icon: FaGithub, href: "https://github.com/watermelon588" },
  {
    label: "LinkedIn",
    Icon: FaLinkedin,
    href: "https://www.linkedin.com/in/maity-rohit",
  },
  {
    label: "Instagram",
    Icon: FaInstagram,
    href: "https://www.instagram.com/lilm.ocha",
  },
  { label: "X", Icon: FaXTwitter, href: "https://x.com/turquoise_0904" },
  { label: "Email", Icon: Mail, href: "mailto:maityrohit021@gmail.com" },
];

const DISCORD_HANDLE = "toiletduck69";

export default function Footer() {
  const toast = useToast();

  const scrollToTop = () =>
    window.scrollTo({ top: 0, behavior: "smooth" });

  // Discord has no public per-username profile URL, so copy the handle and
  // confirm with a toast rather than linking somewhere broken.
  const copyDiscord = async () => {
    try {
      await navigator.clipboard.writeText(DISCORD_HANDLE);
      toast.success(`Discord handle copied: ${DISCORD_HANDLE}`);
    } catch {
      toast.info(`Discord: ${DISCORD_HANDLE}`);
    }
  };

  const socialClass =
    "flex h-9 w-9 items-center justify-center border border-line bg-surface-2 text-base text-ink-2 transition-colors duration-300 hover:border-accent hover:text-accent";

  return (
    <footer
      data-reveal
      className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-10 sm:px-12"
    >
      <div className="border-t border-line pt-14">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1.4fr]">
          {/* Brand */}
          <div>
            <Logo size="xl" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-2">
              A real-time celestial recommendation and telescope alignment
              platform — your location, your telescope, tonight's sky.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {SOCIALS.map(({ label, Icon, href }) => (
                <a
                  key={label}
                  href={href}
                  target={href.startsWith("mailto:") ? undefined : "_blank"}
                  rel="noopener noreferrer"
                  aria-label={label}
                  title={label}
                  className={socialClass}
                >
                  <Icon />
                </a>
              ))}
              <button
                type="button"
                onClick={copyDiscord}
                aria-label={`Copy Discord handle ${DISCORD_HANDLE}`}
                title={`Discord: ${DISCORD_HANDLE} (click to copy)`}
                className={socialClass}
              >
                <FaDiscord />
              </button>
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
              {OVERVIEW_LINKS.map(({ label, href, to }) => (
                <li key={label}>
                  {to ? (
                    <Link
                      to={to}
                      className="text-ink-2 transition-colors duration-300 hover:text-accent"
                    >
                      {label}
                    </Link>
                  ) : (
                    <a
                      href={href}
                      className="text-ink-2 transition-colors duration-300 hover:text-accent"
                    >
                      {label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          {/* Feedback */}
          <FooterFeedback />
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-line pt-6 text-xs text-ink-3 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {BRAND_FULL_NAME}. All rights reserved.
          </p>
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
