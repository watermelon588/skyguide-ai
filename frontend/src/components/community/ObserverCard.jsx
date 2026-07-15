import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Telescope, Eye, Radio, Check, Clock } from "lucide-react";

import Avatar from "../profile/Avatar";

/**
 * One nearby observer, as a flat bento tile.
 *
 * Everything shown is privacy-safe by construction — the server sends a coarse
 * distance band and the observer's own city label, never coordinates.
 *
 * The tile is NOT a single big link: it carries its own "Ping" action, and a
 * <button> inside an <a> is invalid markup. So the name and a footer link are
 * the navigation affordances instead.
 */
export default function ObserverCard({ observer, pingState, onPing }) {
  const {
    username,
    displayName,
    avatar,
    bio,
    place,
    distanceBand,
    telescope,
    observedCount,
  } = observer;

  const name = displayName || username;

  // pingState: "idle" | "pending" | "connected" | "sending"
  const ping = {
    idle: { label: "Ping", Icon: Radio, disabled: false },
    sending: { label: "Sending…", Icon: Radio, disabled: true },
    pending: { label: "Requested", Icon: Clock, disabled: true },
    connected: { label: "Connected", Icon: Check, disabled: true },
  }[pingState || "idle"];

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="flex h-full flex-col border border-line bg-surface-2 p-5 transition-colors hover:bg-surface-3"
    >
      <div className="flex items-start gap-4">
        <Link to={`/observers/${username}`} aria-label={`${name}'s profile`}>
          <Avatar src={avatar} name={name} size={48} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            to={`/observers/${username}`}
            className="block truncate text-base font-semibold text-ink transition-colors hover:text-accent"
          >
            {name}
          </Link>
          <p className="truncate text-sm text-ink-3">@{username}</p>
        </div>
        <span className="shrink-0 border border-line bg-surface-3 px-2 py-1 text-[11px] font-medium text-ink-2">
          {distanceBand}
        </span>
      </div>

      {bio && (
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink-2">
          {bio}
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-4 text-xs text-ink-3">
        {place && (
          <span className="flex items-center gap-1.5">
            <MapPin size={13} /> {place}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <Eye size={13} /> {observedCount} observed
        </span>
        {telescope && (
          <span className="flex items-center gap-1.5">
            <Telescope size={13} />
            {telescope.aperture_mm
              ? `${telescope.aperture_mm} mm`
              : telescope.name}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => onPing?.(username)}
        disabled={ping.disabled}
        className={`mt-4 flex items-center justify-center gap-2 border px-3 py-2 text-xs font-semibold transition-colors ${
          ping.disabled
            ? "cursor-default border-line bg-surface-3 text-ink-3"
            : "border-accent bg-accent text-ink hover:bg-accent-hi"
        }`}
      >
        <ping.Icon size={13} />
        {ping.label}
      </button>
    </motion.div>
  );
}
