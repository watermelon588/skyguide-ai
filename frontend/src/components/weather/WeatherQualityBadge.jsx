import { motion } from "framer-motion";
import { qualityStyle } from "../../utils/weather";

/**
 * Animated pill showing the overall observing quality (Excellent … Unusable).
 * Colour is derived from the shared quality palette so it always matches the
 * score ring. Scales in subtly on mount.
 *
 * @param {{ quality: string, className?: string }} props
 */
export default function WeatherQualityBadge({ quality, className = "" }) {
  const style = qualityStyle(quality);

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${style.bg} ${style.border} ${style.text} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {quality ?? "Unknown"}
    </motion.span>
  );
}
