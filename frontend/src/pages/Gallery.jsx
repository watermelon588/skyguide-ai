import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Images, Upload, Sparkles, Clock, Camera } from "lucide-react";

import BounceCards from "../components/gallery/BounceCards";
import {
  useFitScale,
  buildTransforms,
  rowWidth,
} from "../components/gallery/useFitScale";
import GalleryCard from "../components/gallery/GalleryCard";
import ImageLightbox from "../components/target/ImageLightbox";
import { useGallery } from "../hooks/useGallery";
import { useAuth } from "../context/AuthContext";
import { GALLERY } from "../config/gallery";

/**
 * /gallery — the community gallery.
 *
 * Two halves: a fanned strip of the ten most-liked photos (BounceCards, ported
 * from the Multi-Modal-Search-Engine project), and the full grid beneath it
 * where each photo carries its author and a line from the astronomy canon.
 *
 * Sits inside ProtectedRoute alongside /community, so viewers are signed in.
 * The API itself is optionalAuth, which keeps the door open to making this
 * public later without touching the backend — the signed-out branches below are
 * there for that, not dead code.
 */

/** Split a list into fixed-size chunks, keeping order. */
function chunk(items, size) {
  const rows = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

/**
 * The fanned featured strip, wrapping to a new row every `GALLERY.perRow`.
 *
 * The fan is horizontal, so a single row can only hold so much: past five cards
 * the spread ran wider than the page and the scale-to-fit shrank everything
 * until it was unreadable. Wrapping keeps cards at full size however many there
 * are, and the row width is now FIXED (always sized for a full row), so a short
 * final row doesn't get scaled differently from the ones above it.
 */
function FeaturedStrip({ posts, onOpen }) {
  const rows = useMemo(() => chunk(posts, GALLERY.perRow), [posts]);

  // Width of a FULL row — not of the longest row present — so every row shares
  // one scale and the cards stay the same size across the whole block.
  const naturalWidth = rowWidth(
    Math.min(posts.length, GALLERY.perRow),
    GALLERY,
  );
  const [wrapperRef, scale] = useFitScale(naturalWidth);

  if (!posts.length) return null;

  return (
    <section
      aria-label="Most liked photos"
      className="relative"
      style={{
        overflowX: "clip",
        padding: `${GALLERY.paddingTop}px 0 ${GALLERY.paddingBottom}px`,
      }}
    >
      <div ref={wrapperRef} className="w-full">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center"
          style={{ gap: GALLERY.rowGap * scale }}
        >
          {rows.map((row, rowIndex) => {
            const offset = rowIndex * GALLERY.perRow;
            return (
              <div
                key={offset}
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: "center top",
                  // Reserve only the SCALED height, or each row would keep the
                  // full unscaled box and leave a growing gap beneath it.
                  height: GALLERY.containerHeight * scale,
                }}
              >
                <BounceCards
                  images={row.map((p) => p.url)}
                  labels={row.map(
                    (p) =>
                      p.caption || `Photo by ${p.author?.username ?? "observer"}`,
                  )}
                  cardSize={GALLERY.cardSize}
                  pushDistance={GALLERY.hoverPush}
                  containerWidth={naturalWidth}
                  containerHeight={GALLERY.containerHeight}
                  // Stagger continues across rows so the whole block bounces in
                  // as one sequence rather than every row starting together.
                  animationDelay={0.15 + rowIndex * 0.12}
                  animationStagger={0.07}
                  easeType="elastic.out(1, 0.6)"
                  transformStyles={buildTransforms(row.length, GALLERY)}
                  rankOffset={offset}
                  onCardClick={(i) => onOpen(row[i])}
                  enableHover
                />
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

export default function Gallery() {
  const [sort, setSort] = useState("top");
  const [lightbox, setLightbox] = useState(null);
  const { isAuthenticated } = useAuth();
  const { posts, isLoading, isError, like, remove } = useGallery(sort);

  // The featured strip is always the most-liked ten, regardless of how the grid
  // below is currently sorted.
  const { posts: topPosts } = useGallery("top");
  const featured = topPosts.slice(0, 10);

  return (
    <div className="min-h-screen bg-bg px-6 py-10 text-ink lg:px-10">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-accent">
              Community
            </p>
            <h1 className="mt-1 flex items-center gap-2.5 text-3xl font-bold text-ink">
              <Images size={26} className="text-accent" />
              Explore gallery
            </h1>
            <p className="mt-1 text-sm text-ink-3">
              Nights other observers thought worth keeping. The ten most-loved
              are fanned out below.
            </p>
          </div>

          {isAuthenticated && (
            <Link
              to="/profile#share-photo"
              className="flex items-center gap-2 border border-line bg-surface-2 px-4 py-2 text-sm text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink"
            >
              <Upload size={14} /> Share a photo
            </Link>
          )}
        </div>

        {/* Featured fan — the top ten */}
        {!isLoading && featured.length > 0 && (
          <FeaturedStrip posts={featured} onOpen={setLightbox} />
        )}

        {/* Sort toggle */}
        <div className="mt-2 flex items-center gap-2 border-b border-line pb-4">
          {[
            { key: "top", label: "Most liked", icon: Sparkles },
            { key: "recent", label: "Newest", icon: Clock },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSort(key)}
              className={`flex items-center gap-2 border px-3.5 py-2 text-sm transition-colors ${
                sort === key
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-line bg-surface-2 text-ink-3 hover:bg-surface-3 hover:text-ink"
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] animate-pulse border border-line bg-surface-2"
              />
            ))}
          </div>
        ) : isError ? (
          <div className="mx-auto mt-10 flex max-w-lg flex-col items-center border border-line bg-surface-2 px-8 py-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center border border-line bg-surface-3 text-accent">
              <Images size={24} />
            </span>
            <h2 className="mt-5 text-lg font-semibold text-ink">
              Couldn't load the gallery
            </h2>
            <p className="mt-2 text-sm text-ink-2">
              Please refresh the page to try again.
            </p>
          </div>
        ) : posts.length === 0 ? (
          <div className="mx-auto mt-10 flex max-w-lg flex-col items-center border border-line bg-surface-2 px-8 py-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center border border-line bg-surface-3 text-accent">
              <Camera size={24} />
            </span>
            <h2 className="mt-5 text-lg font-semibold text-ink">
              No photos yet
            </h2>
            <p className="mt-2 text-sm text-ink-2">
              {isAuthenticated ? (
                <>
                  Be the first — share a shot from your{" "}
                  <Link
                    to="/profile#share-photo"
                    className="font-semibold text-accent hover:text-accent-hi"
                  >
                    profile
                  </Link>
                  .
                </>
              ) : (
                <>Sign in to share the first one.</>
              )}
            </p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <GalleryCard
                key={post.id}
                post={post}
                onLike={isAuthenticated ? like : undefined}
                onDelete={remove}
                onOpen={setLightbox}
              />
            ))}
          </div>
        )}
      </div>

      <ImageLightbox
        open={Boolean(lightbox)}
        src={lightbox?.url}
        alt={lightbox?.caption || "Community photo"}
        credit={
          lightbox?.author
            ? `© ${lightbox.author.displayName || lightbox.author.username}`
            : undefined
        }
        onClose={() => setLightbox(null)}
      />
    </div>
  );
}
