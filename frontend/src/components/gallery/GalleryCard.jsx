import { Link } from "react-router-dom";
import { Heart, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

import Avatar from "../profile/Avatar";
import { quoteForId } from "../../config/gallery";

/**
 * One gallery photo: the image, who shared it, and a line from the literature.
 *
 * The quote is chosen by a stable hash of the post id (quoteForId), so a photo
 * keeps the same line forever rather than reshuffling on every render or like.
 */
export default function GalleryCard({ post, onLike, onDelete, onOpen }) {
  const quote = quoteForId(post.id);
  const name = post.author?.displayName || post.author?.username || "Observer";

  return (
    <motion.figure
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="group flex flex-col border border-line bg-surface-2 transition-colors duration-300 hover:bg-surface-3"
    >
      {/* Image */}
      <button
        type="button"
        onClick={() => onOpen?.(post)}
        className="relative block aspect-square w-full overflow-hidden bg-surface-3"
        aria-label={`View ${post.caption || "photo"} by ${name}`}
      >
        <img
          src={post.url}
          alt={post.caption || `Astrophotography by ${name}`}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </button>

      <figcaption className="flex flex-1 flex-col gap-3 p-4">
        {post.caption && (
          <p className="text-sm leading-snug text-ink">{post.caption}</p>
        )}

        {/* Who shared it */}
        <div className="flex items-center justify-between gap-3">
          <Link
            to={`/observers/${post.author?.username ?? ""}`}
            className="flex min-w-0 items-center gap-2.5 text-ink-2 transition-colors hover:text-accent"
          >
            <Avatar
              src={post.author?.avatar}
              name={name}
              size={28}
            />
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold text-ink">
                {name}
              </span>
              <span className="block truncate text-[11px] text-ink-3">
                @{post.author?.username}
              </span>
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-1">
            {post.isMine && (
              <button
                type="button"
                onClick={() => onDelete?.(post.id)}
                aria-label="Remove this photo"
                className="p-2 text-ink-4 transition-colors hover:text-danger"
              >
                <Trash2 size={15} />
              </button>
            )}
            <button
              type="button"
              onClick={() => onLike?.(post.id)}
              aria-pressed={post.likedByMe}
              aria-label={post.likedByMe ? "Remove like" : "Like this photo"}
              className={`flex items-center gap-1.5 px-2 py-1.5 text-sm transition-colors ${
                post.likedByMe
                  ? "text-accent"
                  : "text-ink-3 hover:text-accent"
              }`}
            >
              <Heart
                size={16}
                fill={post.likedByMe ? "currentColor" : "none"}
              />
              <span className="tabular-nums">{post.likeCount}</span>
            </button>
          </div>
        </div>

        {/* The line beneath — a quote from the astronomy canon. */}
        <blockquote className="mt-auto border-t border-line pt-3">
          <p className="text-xs italic leading-relaxed text-ink-2">
            “{quote.text}”
          </p>
          <cite className="mt-1.5 block text-[11px] not-italic uppercase tracking-[0.12em] text-ink-4">
            — {quote.source}
          </cite>
        </blockquote>
      </figcaption>
    </motion.figure>
  );
}
