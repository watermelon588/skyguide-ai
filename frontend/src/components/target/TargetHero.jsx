import { useState } from "react";
import { motion } from "framer-motion";
import { Crosshair, Expand } from "lucide-react";

import ScoreRing from "../tonight/fx/ScoreRing";
import AddToPlanButton from "../plan/AddToPlanButton";
import ImageLightbox from "./ImageLightbox";
import ProgressiveImage from "../common/ProgressiveImage";
import { typeMeta } from "../tonight/vocabulary";
import { usePairing } from "../../context/PairingContext";
import { useObserveTarget } from "../../hooks/useObserveTarget";

/**
 * Target Panel hero — the object's identity plus its two actions
 * (Add to plan / Start Observing).
 *
 * Media policy per the design system: real imagery drops in through
 * `media.hero_image`/`thumbnail` when the catalog gains assets; until then
 * the fallback is an honest type-glyph gradient, never stock placeholder art.
 *
 * Start Observing routes through useObserveTarget — the shared "shortest path
 * to guidance" (paired -> /alignment pre-aimed; otherwise the dashboard's
 * guided flow). One click, nobody types a catalog id.
 */
export default function TargetHero({ target }) {
  const { pairing } = usePairing();
  const observeTarget = useObserveTarget();
  const meta = typeMeta(target.object_type);
  const image = target.hero_image || target.thumbnail || null;
  const [zoomed, setZoomed] = useState(false);

  const paired = pairing.status === "connected";
  const startObserving = () => observeTarget(target.catalog_id);

  return (
    <section className="overflow-hidden border border-line bg-surface-2">
      {/* Visual band */}
      <div className="relative flex h-56 items-center justify-center overflow-hidden sm:h-72">
        {image ? (
          <button
            type="button"
            onClick={() => setZoomed(true)}
            aria-label="Expand image"
            className="group absolute inset-0 h-full w-full cursor-zoom-in"
          >
            <ProgressiveImage
              src={image}
              placeholder={target.thumbnail}
              alt={target.name || target.catalog_id}
            />
            {/* Expand affordance — appears on hover, always tappable on touch. */}
            <span className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center border border-line bg-surface-2/80 text-ink-2 opacity-0 transition-opacity group-hover:opacity-100 sm:opacity-70">
              <Expand size={16} />
            </span>
          </button>
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-surface-3 via-surface-1 to-bg" />
            <span
              aria-hidden="true"
              className="relative text-[7rem] leading-none text-accent/25 sm:text-[9rem]"
            >
              {meta.symbol}
            </span>
          </>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-surface-1 to-transparent" />
        {image && target.imageCredit && (
          <span className="pointer-events-none absolute bottom-1.5 right-2 text-[10px] text-ink-3/80">
            {target.imageCredit}
          </span>
        )}
      </div>

      <ImageLightbox
        src={image}
        alt={target.name || target.catalog_id}
        credit={target.imageCredit}
        open={zoomed}
        onClose={() => setZoomed(false)}
      />

      {/* Identity + actions */}
      <div className="flex flex-wrap items-end justify-between gap-6 p-6 sm:p-8">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-accent">
            {target.catalog_id} · {meta.symbol} {meta.label}
            {target.constellation && ` · ${target.constellation}`}
          </p>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-ink sm:text-5xl">
            {target.name || target.catalog_id}
          </h1>
          {target.aliases?.length > 0 && (
            <p className="mt-1 text-sm text-ink-3">
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
            onClick={startObserving}
            title={
              !target.visible
                ? "Below your horizon right now — try when it rises"
                : paired
                  ? "Start guiding your telescope to this target now"
                  : "Guided telescope alignment onto this target"
            }
            className="flex items-center gap-2 bg-accent px-6 py-2.5 text-sm font-semibold text-ink transition-colors duration-300 hover:bg-accent-hi disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Crosshair size={15} />
            Start observing
          </motion.button>
        </div>
      </div>
    </section>
  );
}
