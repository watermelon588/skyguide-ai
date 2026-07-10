import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

import ScoreRing from "./fx/ScoreRing";
import {
  compassPoint,
  formatDec,
  formatDegrees,
  formatDistance,
  formatHourAngle,
  formatMagnitude,
  formatRA,
  typeMeta,
} from "./vocabulary";

/**
 * Object dossier — a right-hand glass drawer with everything the platform
 * knows about one target: live geometry, physical data, J2000 coordinates,
 * description and observation tips. Framer Motion owns the open/close
 * micro-interaction (0.3s, no bounce), per the design system.
 */
export default function ObjectDrawer({ object, onClose }) {
  // Escape closes, and the page behind the drawer stops scrolling.
  useEffect(() => {
    if (!object) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [object, onClose]);

  const meta = object ? typeMeta(object.object_type) : null;
  const visible = object?.visibility_score != null;

  const liveFacts = object
    ? [
        ["Altitude", formatDegrees(object.altitude_deg)],
        [
          "Azimuth",
          object.azimuth_deg != null
            ? `${formatDegrees(object.azimuth_deg)} ${compassPoint(object.azimuth_deg)}`
            : "—",
        ],
        ["Hour angle", formatHourAngle(object.hour_angle_hours)],
        ["Rank tonight", object.rank ? `#${object.rank}` : "—"],
      ]
    : [];

  const staticFacts = object
    ? [
        ["Magnitude", formatMagnitude(object.magnitude)],
        [
          "Apparent size",
          object.angular_size_arcmin != null
            ? `${object.angular_size_arcmin.toFixed(1)}′`
            : "—",
        ],
        ["Distance", formatDistance(object.distance_ly)],
        ["RA (J2000)", formatRA(object.ra_deg)],
        ["Dec (J2000)", formatDec(object.dec_deg)],
        ["Difficulty", object.difficulty || "—"],
        ["Best season", object.season || "—"],
        ["Catalog", object.catalog || "—"],
      ]
    : [];

  return (
    <AnimatePresence>
      {object && (
        <>
          <motion.div
            key="drawer-backdrop"
            className="fixed inset-0 z-40 bg-[#05070A]/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <motion.aside
            key="drawer"
            role="dialog"
            aria-modal="true"
            aria-label={`${object.name || object.catalog_id} details`}
            className="no-scrollbar fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-white/10 bg-[#0B0F16]/95 p-8 shadow-2xl backdrop-blur-3xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.25em] text-[#FF8C1A]">
                  {object.catalog_id} · {meta.symbol} {meta.label}
                </p>
                <h3 className="mt-2 text-3xl font-bold text-white">
                  {object.name || object.catalog_id}
                </h3>
                {object.aliases?.length > 0 && (
                  <p className="mt-1 text-sm text-[#6B7280]">
                    also “{object.aliases.join("”, “")}”
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close details"
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-[#AAB4C5] transition-colors hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 flex items-center gap-5 rounded-2xl border border-white/10 bg-white/5 p-5">
              <ScoreRing score={object.visibility_score} size={72} strokeWidth={5} />
              <div>
                <p className="font-semibold text-white">
                  {visible ? "Above your horizon" : "Below your horizon"}
                </p>
                <p className="text-xs text-[#AAB4C5]">
                  {visible
                    ? "Live visibility score for your location, right now."
                    : "Not currently observable — check its best season below."}
                </p>
              </div>
            </div>

            {visible && (
              <dl className="mt-5 grid grid-cols-2 gap-3">
                {liveFacts.map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <dt className="text-[10px] uppercase tracking-[0.2em] text-[#6B7280]">
                      {label}
                    </dt>
                    <dd className="mt-1 text-lg font-semibold tabular-nums text-white">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            {object.description && (
              <p className="mt-6 leading-relaxed text-[#AAB4C5]">
                {object.description}
              </p>
            )}

            <dl className="mt-6 space-y-1.5">
              {staticFacts.map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-baseline justify-between gap-4 border-b border-white/5 pb-1.5 text-sm"
                >
                  <dt className="text-[#6B7280]">{label}</dt>
                  <dd className="text-right font-medium tabular-nums text-white">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>

            {object.tips?.length > 0 && (
              <div className="mt-6">
                <p className="text-[11px] uppercase tracking-[0.25em] text-[#FF8C1A]">
                  Observation tips
                </p>
                <ul className="mt-3 space-y-2">
                  {object.tips.map((tip) => (
                    <li
                      key={tip}
                      className="border-l-2 border-[#FF8C1A]/40 pl-3 text-sm leading-relaxed text-[#AAB4C5]"
                    >
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
