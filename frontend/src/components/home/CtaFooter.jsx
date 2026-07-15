import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import MagneticButton from "../fx/MagneticButton";
import AngularText from "../fx/AngularText";

/**
 * Closing invitation. One oversized flat panel with a bold blue action — the
 * page's last word before the site footer takes over. Routing/auth unchanged.
 */
export default function CtaFooter() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <section className="mx-auto w-full max-w-7xl px-6 sm:px-12">
      <div
        data-reveal
        className="relative overflow-hidden border border-line bg-surface-1 px-8 py-12 text-center sm:py-16"
      >
        {/* graphic accent bar */}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1 bg-accent"
        />
        <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-accent">
          Clear skies are waiting
        </p>
        <AngularText
          text="The sky above you is already computed."
          className="mx-auto mt-4 max-w-2xl text-2xl font-black uppercase leading-[0.98] tracking-tight text-ink sm:text-4xl"
        />
        <p className="mx-auto mt-4 max-w-xl text-sm text-ink-2">
          Sign in, share your coordinates, and meet tonight's best targets in
          under a minute.
        </p>
        <div className="mt-8 flex justify-center">
          <MagneticButton
            onClick={() => navigate(isAuthenticated ? "/tonight" : "/login")}
            className="inline-flex items-center gap-2 bg-accent px-8 py-4 font-semibold text-ink transition-colors duration-300 hover:bg-accent-hi"
          >
            {isAuthenticated ? "Open tonight's sky" : "Begin your first session"}
            <ArrowRight size={18} />
          </MagneticButton>
        </div>
      </div>
    </section>
  );
}
