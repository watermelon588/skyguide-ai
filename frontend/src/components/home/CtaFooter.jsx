import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import { useAuth } from "../../context/AuthContext";
import SpotlightCard from "../tonight/fx/SpotlightCard";

/**
 * Closing invitation. One oversized glass panel, one orange action — the
 * page's last word before the site footer takes over.
 */
export default function CtaFooter() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <section className="mx-auto w-full max-w-6xl px-6 sm:px-12">
      <SpotlightCard data-reveal className="px-8 py-16 text-center sm:py-20">
        <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-[#FF8C1A]">
          Clear skies are waiting
        </p>
        <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-bold leading-tight text-white sm:text-5xl">
          The sky above you is already computed.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[#AAB4C5]">
          Sign in, share your coordinates, and meet tonight's best targets in
          under a minute.
        </p>
        <motion.button
          type="button"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate(isAuthenticated ? "/tonight" : "/login")}
          className="mt-8 rounded-xl bg-[#FF8C1A] px-9 py-4 font-semibold text-[#090B10] shadow-2xl transition-colors duration-300 hover:bg-[#FF6B00]"
        >
          {isAuthenticated ? "Open tonight's sky" : "Begin your first session"}
        </motion.button>
      </SpotlightCard>
    </section>
  );
}
