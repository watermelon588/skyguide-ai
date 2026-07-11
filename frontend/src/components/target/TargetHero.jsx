import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Crosshair } from "lucide-react";

import ScoreRing from "../tonight/fx/ScoreRing";
import AddToPlanButton from "../plan/AddToPlanButton";
import { typeMeta } from "../tonight/vocabulary";

/**
 * Target Panel hero — the object's identity plus its two actions
 * (Add to plan / Start Observing).
 *
 * Media policy per the design system: real imagery drops in through
 * `media.hero_image`/`thumbnail` when the catalog gains assets; until then
 * the fallback is an honest type-glyph gradient, never stock placeholder art.
 * Start Observing hands off to the dashboard's guided flow
 * (`/dashboard?observe=<id>`), which walks telescope → pairing → alignment.
 */
export default function TargetHero({ target }) {
  const navigate = useNavigate();
  const meta = typeMeta(target.object_type);
  const image = target.hero_image || target.thumbnail || null;

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-3xl">
      {/* Visual band */}
      <div className="relative flex h-56 items-center justify-center overflow-hidden sm:h-72">
        {image ? (
          <img
            src={image}
            alt={target.name || target.catalog_id}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-[#131A26] via-[#0B0F16] to-[#05070A]" />
            <span
              aria-hidden="true"
              className="relative text-[7rem] leading-none text-[#FF8C1A]/25 sm:text-[9rem]"
            >
              {meta.symbol}
            </span>
          </>
        )}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0B0F16] to-transparent" />
      </div>

      {/* Identity + actions */}
      <div className="flex flex-wrap items-end justify-between gap-6 p-6 sm:p-8">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-[#FF8C1A]">
            {target.catalog_id} · {meta.symbol} {meta.label}
            {target.constellation && ` · ${target.constellation}`}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white sm:text-5xl">
            {target.name || target.catalog_id}
          </h1>
          {target.aliases?.length > 0 && (
            <p className="mt-1 text-sm text-[#6B7280]">
              also “{target.aliases.join("”, “")}”
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ScoreRing
            score={target.visible ? target.visibility_score : null}
            size={64}
            strokeWidth={5}
          />
          <AddToPlanButton catalogId={target.catalog_id} variant="full" />
          <motion.button
            type="button"
            whileHover={target.visible ? { scale: 1.03 } : undefined}
            whileTap={target.visible ? { scale: 0.97 } : undefined}
            disabled={!target.visible}
            onClick={() =>
              navigate(`/dashboard?observe=${target.catalog_id}`)
            }
            title={
              target.visible
                ? "Guided telescope alignment onto this target"
                : "Below your horizon right now — try when it rises"
            }
            className="flex items-center gap-2 rounded-xl bg-[#FF8C1A] px-6 py-2.5 text-sm font-semibold text-[#090B10] transition-colors duration-300 hover:bg-[#FF6B00] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Crosshair size={15} />
            Start observing
          </motion.button>
        </div>
      </div>
    </section>
  );
}
