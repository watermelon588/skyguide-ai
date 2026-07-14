/**
 * Observer avatar — the stored image, or initials on a deterministic tinted
 * disc when there's none. Used in the navbar, profile pages, and (later)
 * community cards, so every "who is this" spot renders identically.
 */

const TINTS = [
  "#0049CD", "#1E63FF", "#22C55E", "#38BDF8",
  "#A78BFA", "#F472B6", "#FBBF24", "#2DD4BF",
];

function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Stable tint from the name so a given observer keeps the same color. */
function tintFor(seed = "") {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return TINTS[Math.abs(hash) % TINTS.length];
}

export default function Avatar({ src, name, size = 40, className = "" }) {
  const dimension = { width: size, height: size };

  if (src) {
    return (
      <img
        src={src}
        alt={name ? `${name}'s avatar` : "avatar"}
        style={dimension}
        className={`shrink-0 rounded-full border border-line object-cover ${className}`}
      />
    );
  }

  const tint = tintFor(name);
  return (
    <span
      aria-hidden="true"
      style={{
        ...dimension,
        background: `${tint}22`,
        color: tint,
        fontSize: size * 0.4,
      }}
      className={`flex shrink-0 items-center justify-center rounded-full border border-line font-bold ${className}`}
    >
      {initials(name)}
    </span>
  );
}
