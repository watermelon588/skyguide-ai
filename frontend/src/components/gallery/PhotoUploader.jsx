import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Camera, Images, X } from "lucide-react";

import { useGallery, useObserverGallery } from "../../hooks/useGallery";
import { useToast } from "../../context/ToastContext";

const MAX_BYTES = 8 * 1024 * 1024; // keep in step with the route's multer limit
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

/**
 * "Share a photo" — the gallery's upload entry point, on the observer's own
 * profile.
 *
 * Validates type and size CLIENT-side purely so the user hears about a bad file
 * immediately instead of after uploading eight megabytes; the server enforces
 * the same limits independently and is the real gate.
 */
export default function PhotoUploader({ username }) {
  const inputRef = useRef(null);
  const toast = useToast();
  const { upload, isUploading, remove } = useGallery("top");
  const { posts } = useObserverGallery(username);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [caption, setCaption] = useState("");

  const clear = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview("");
    setCaption("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const onPick = (event) => {
    const chosen = event.target.files?.[0];
    if (!chosen) return;

    if (!ACCEPTED.includes(chosen.type)) {
      toast.error("Choose a JPEG, PNG or WEBP image.");
      return;
    }
    if (chosen.size > MAX_BYTES) {
      toast.error("That image is larger than 8 MB. Please compress it first.");
      return;
    }

    if (preview) URL.revokeObjectURL(preview);
    setFile(chosen);
    setPreview(URL.createObjectURL(chosen));
  };

  const onShare = async () => {
    if (!file) return;
    try {
      await upload({ file, caption });
      clear();
    } catch {
      // useGallery's mutation already surfaced the reason as a toast; keep the
      // chosen file so the observer can simply retry.
    }
  };

  return (
    <section
      id="share-photo"
      className="space-y-4 border border-line bg-surface-2 p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.15em] text-ink-3">
            <Camera size={15} className="text-accent" />
            Share your night
          </h2>
          <p className="mt-1 text-sm text-ink-2">
            Post a photo to the community gallery. Others can like it — the ten
            most-liked are featured.
          </p>
        </div>
        <Link
          to="/gallery"
          className="flex items-center gap-2 border border-line bg-surface-3 px-3.5 py-2 text-sm text-ink-2 transition-colors hover:text-accent"
        >
          <Images size={14} /> Open gallery
        </Link>
      </div>

      {/* Picker / preview */}
      {!preview ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 border border-dashed border-line bg-surface-3 px-6 py-10 text-center transition-colors hover:border-accent hover:text-accent"
        >
          <Camera size={22} className="text-accent" />
          <span className="text-sm font-semibold text-ink">
            Choose a photo
          </span>
          <span className="text-xs text-ink-3">
            JPEG, PNG or WEBP · up to 8 MB
          </span>
        </button>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <img
              src={preview}
              alt="Selected photo preview"
              className="max-h-72 w-full border border-line object-contain"
            />
            <button
              type="button"
              onClick={clear}
              aria-label="Discard selection"
              className="absolute right-2 top-2 border border-line bg-surface-2 p-2 text-ink-2 transition-colors hover:text-danger"
            >
              <X size={15} />
            </button>
          </div>

          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={140}
            placeholder="Add a short caption (optional) — what is it, and how did you catch it?"
            className="w-full border border-line bg-surface-3 px-4 py-3 text-sm text-ink outline-none placeholder:text-ink-4 transition-colors focus:border-accent"
          />

          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-ink-4">{caption.length}/140</span>
            <button
              type="button"
              onClick={onShare}
              disabled={isUploading}
              className="bg-accent px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-accent-hi disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isUploading ? "Sharing…" : "Share photo"}
            </button>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        onChange={onPick}
        className="hidden"
      />

      {/* What this observer has already shared */}
      {posts.length > 0 && (
        <div className="border-t border-line pt-4">
          <p className="text-xs uppercase tracking-[0.15em] text-ink-4">
            Your photos · {posts.length}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {posts.map((post) => (
              <div key={post.id} className="group relative">
                <img
                  src={post.url}
                  alt={post.caption || "Your shared photo"}
                  className="h-20 w-20 border border-line object-cover"
                  loading="lazy"
                />
                <span className="absolute bottom-0 left-0 bg-surface-1/90 px-1.5 py-0.5 text-[10px] text-ink-2">
                  ♥ {post.likeCount}
                </span>
                <button
                  type="button"
                  onClick={() => remove(post.id)}
                  aria-label="Remove this photo"
                  className="absolute right-0 top-0 hidden bg-surface-2 p-1 text-ink-3 transition-colors hover:text-danger group-hover:block"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
