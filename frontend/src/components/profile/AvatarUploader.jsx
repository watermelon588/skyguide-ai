import { useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";

import Avatar from "./Avatar";

/**
 * Avatar picker: file → center-cropped 256px square → compressed data URL,
 * done entirely in-browser on a canvas so the payload that reaches the
 * gateway is always small and square (no server-side image processing, no
 * external CDN needed). The uploader owns the file/crop mechanics; the parent
 * owns persistence via onSelect/onClear.
 */

const OUTPUT_SIZE = 256;
const MAX_INPUT_BYTES = 8 * 1024 * 1024; // reject huge originals before decode

/** Draw the largest centered square of the image, scaled to 256, as WEBP/JPEG. */
function cropToDataUrl(image) {
  const side = Math.min(image.width, image.height);
  const sx = (image.width - side) / 2;
  const sy = (image.height - side) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, sx, sy, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  // WEBP is far smaller; fall back to JPEG if the browser returns a PNG
  // (indicates no WEBP encoder), both accepted by the gateway.
  const webp = canvas.toDataURL("image/webp", 0.85);
  return webp.startsWith("data:image/webp")
    ? webp
    : canvas.toDataURL("image/jpeg", 0.85);
}

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not read that image."));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

export default function AvatarUploader({
  avatar,
  name,
  onSelect,
  onClear,
  busy = false,
}) {
  const inputRef = useRef(null);
  const [error, setError] = useState("");

  const onFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-picking the same file
    if (!file) return;
    setError("");

    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
      setError("Use a PNG, JPEG, or WEBP image.");
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      setError("That image is over 8 MB — pick a smaller one.");
      return;
    }
    try {
      const image = await fileToImage(file);
      onSelect(cropToDataUrl(image));
    } catch (err) {
      setError(err.message || "Couldn't process that image.");
    }
  };

  return (
    <div className="flex items-center gap-5">
      <div className="relative">
        <Avatar src={avatar} name={name} size={88} />
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
            <Loader2 size={22} className="animate-spin text-ink" />
          </span>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex items-center gap-2 bg-accent px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-accent-hi disabled:opacity-60"
          >
            <Camera size={15} />
            {avatar ? "Change photo" : "Upload photo"}
          </button>
          {avatar && (
            <button
              type="button"
              onClick={onClear}
              disabled={busy}
              className="flex items-center gap-2 border border-line bg-surface-2 px-4 py-2 text-sm text-ink-2 transition-colors hover:border-danger hover:text-danger disabled:opacity-60"
            >
              <Trash2 size={15} />
              Remove
            </button>
          )}
        </div>
        <p className="text-xs text-ink-3">
          Square crop, auto-resized to 256px. PNG/JPEG/WEBP.
        </p>
        {error && <p className="text-xs text-danger">{error}</p>}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={onFile}
          className="hidden"
        />
      </div>
    </div>
  );
}
