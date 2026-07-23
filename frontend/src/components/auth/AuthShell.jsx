import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

import Logo from "../brand/Logo";
import { BRAND_FULL_NAME } from "../../config/brand";
import loginImage from "../../assets/bg/9.jpg";

/**
 * The shared auth-screen frame (redesign v2.0 "Bento / Electric Blue").
 *
 * Extracted from LoginPage so the password-reset screens are visually identical
 * to the front door rather than a near-miss: same editorial split, same
 * full-bleed image panel, same flat radius-0 form column. LoginPage keeps its
 * own copy of this markup — it carries extra states (verify step, mode toggle)
 * that don't belong in a generic shell, and rewriting it was out of scope.
 *
 * @param {string} title      Big uppercase heading.
 * @param {string} subtitle   One line under the heading.
 * @param {string} backTo     Route for the back link.
 * @param {string} backLabel  Text for the back link.
 */
export default function AuthShell({
  title,
  subtitle,
  backTo = "/login",
  backLabel = "Back to sign in",
  children,
}) {
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-screen bg-bg text-ink">
      {/* Left — full-bleed image panel (editorial, desktop only) */}
      <div className="relative hidden overflow-hidden border-r border-line lg:block lg:w-1/2 xl:w-3/5">
        <img
          src={loginImage}
          alt=""
          className="absolute inset-0 h-full w-full scale-105 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-black via-black/75 to-black/25" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link to="/" aria-label={`${BRAND_FULL_NAME} — home`}>
            <Logo size="md" decorative />
          </Link>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-accent">
              Your intelligent astronomy copilot
            </p>
            <h2 className="mt-5 max-w-lg text-5xl font-black uppercase leading-[0.95] tracking-tight text-ink xl:text-6xl">
              Discover the universe, one night at a time.
            </h2>
          </div>
          <p className="text-xs uppercase tracking-[0.15em] text-ink-3">
            13,000+ deep-sky objects · live visibility scoring · phone-guided
            alignment
          </p>
        </div>
      </div>

      {/* Right — the form column */}
      <div className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2 xl:w-2/5">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-sm"
        >
          <button
            type="button"
            onClick={() => navigate(backTo)}
            className="mb-10 inline-flex items-center gap-2 text-sm text-ink-2 transition-colors duration-300 hover:text-accent"
          >
            <ArrowLeft size={16} />
            {backLabel}
          </button>

          <Logo size="xl" className="lg:hidden" />

          <h1 className="mt-2 text-4xl font-black uppercase tracking-tight text-ink">
            {title}
          </h1>
          {subtitle && <p className="mt-2 text-sm text-ink-3">{subtitle}</p>}

          {children}
        </motion.div>
      </div>
    </div>
  );
}

/** Shared input styling — matches LoginPage exactly. */
export const authInputClass =
  "w-full border border-line bg-surface-2 px-4 py-3 text-ink outline-none " +
  "placeholder:text-ink-3 transition-colors duration-300 focus:border-accent";
