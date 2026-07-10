import { Link } from "react-router-dom";
import { motion } from "framer-motion";

/**
 * Dashboard entry point for the /tonight experience — a slim glass banner
 * that invites the observer into the full-screen sky report.
 */
export default function TonightBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <Link
        to="/tonight"
        className="group flex items-center justify-between gap-4 rounded-2xl border border-[#FF8C1A]/25 bg-gradient-to-r from-[#FF8C1A]/10 via-white/5 to-white/5 px-6 py-5 shadow-2xl backdrop-blur-3xl transition-colors duration-300 hover:border-[#FF8C1A]/50"
      >
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-[#FF8C1A]">
            Live sky report
          </p>
          <p className="mt-1 text-lg font-semibold text-white">
            Tonight — your personalized celestial recommendations
          </p>
          <p className="mt-0.5 text-sm text-[#AAB4C5]">
            All-sky chart, ranked targets, Moon and conditions — computed for
            your exact coordinates.
          </p>
        </div>
        <span className="shrink-0 rounded-xl bg-[#FF8C1A] px-5 py-2.5 text-sm font-semibold text-[#090B10] transition-all duration-300 group-hover:bg-[#FF6B00]">
          Open →
        </span>
      </Link>
    </motion.div>
  );
}
