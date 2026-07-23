import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";

import AngularText from "../fx/AngularText";
import BounceCards from "../gallery/BounceCards";
import {
  useFitScale,
  buildTransforms,
  rowWidth,
} from "../gallery/useFitScale";
import { fetchTopGallery } from "../../services/gallery.service";
import { GALLERY } from "../../config/gallery";

/**
 * Landing-page gallery teaser — ONE fanned row of the community's best photos.
 *
 * Deliberately a single row, unlike /gallery which wraps: this is a taste, not
 * the archive. `LANDING_COUNT` is 7 rather than the gallery's 5-per-row because
 * the landing section is full-bleed (max-w-7xl) and can carry the wider fan
 * without scaling down.
 *
 * Fetched live rather than hardcoded, for two reasons: the photos are real
 * community uploads and should stay current without a redeploy, and bundling
 * copies would have added ~1.3 MB of images to the landing page — the opposite
 * of the asset cleanup this page just went through.
 *
 * Renders NOTHING when there are no photos or the gateway is unreachable. A
 * marketing page with an empty frame looks broken; an absent section just looks
 * like the page ends there.
 */

const LANDING_COUNT = 7;

export default function HomeGallery() {
  const { data: posts = [] } = useQuery({
    queryKey: ["gallery", "landing"],
    queryFn: fetchTopGallery,
    staleTime: 5 * 60 * 1000,
    // The landing page is public and must never surface an error state for
    // this: it's decoration, not content.
    retry: 1,
  });

  const shown = posts.slice(0, LANDING_COUNT);
  const naturalWidth = rowWidth(shown.length, GALLERY);
  const [wrapperRef, scale] = useFitScale(naturalWidth);

  if (!shown.length) return null;

  return (
    <section
      id="gallery"
      className="mx-auto w-full max-w-7xl scroll-mt-24 px-6 sm:px-12"
    >
      <div
        data-reveal
        className="mb-10 flex flex-wrap items-end justify-between gap-4"
      >
        <div className="max-w-2xl">
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-accent">
            From the community
          </p>
          <AngularText
            text="Nights worth keeping"
            className="mt-3 text-4xl font-black uppercase leading-[0.95] tracking-tight text-ink sm:text-5xl"
          />
          <p className="mt-4 text-ink-2">
            Photographs shared by observers using SkyGuide — the ones everyone
            else loved most.
          </p>
        </div>

        <Link
          to="/gallery"
          className="group flex items-center gap-2 border border-line bg-surface-2 px-4 py-2.5 text-sm text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink"
        >
          Explore gallery
          <ArrowUpRight
            size={15}
            className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </Link>
      </div>

      <div ref={wrapperRef} data-reveal className="flex w-full justify-center">
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "center top",
            // Reserve only the scaled height, or the section keeps a large
            // empty gap beneath the cards on narrow screens.
            height: GALLERY.containerHeight * scale,
          }}
        >
          <BounceCards
            images={shown.map((p) => p.url)}
            labels={shown.map(
              (p) =>
                p.caption || `Photo by ${p.author?.username ?? "an observer"}`,
            )}
            cardSize={GALLERY.cardSize}
            pushDistance={GALLERY.hoverPush}
            containerWidth={naturalWidth}
            containerHeight={GALLERY.containerHeight}
            animationDelay={0.1}
            animationStagger={0.07}
            easeType="elastic.out(1, 0.6)"
            transformStyles={buildTransforms(shown.length, GALLERY)}
            showRank={false}
            enableHover
          />
        </div>
      </div>
    </section>
  );
}
