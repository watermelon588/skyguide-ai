import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Telescope, Eye } from "lucide-react";

import Avatar from "../profile/Avatar";

/**
 * One nearby observer, as a flat bento tile linking to their public profile.
 * Everything shown is privacy-safe by construction — the server sends a coarse
 * distance band and the observer's own city label, never coordinates.
 */
export default function ObserverCard({ observer }) {
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

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
    >
      <Link
        to={`/observers/${username}`}
        className="group flex h-full flex-col border border-line bg-surface-2 p-5 transition-colors hover:bg-surface-3 hover:outline hover:outline-1 hover:outline-accent"
      >
        <div className="flex items-start gap-4">
          <Avatar src={avatar} name={name} size={48} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-ink group-hover:text-accent">
              {name}
            </p>
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
              <MapPin size={13} className="text-ink-3" />
              {place}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Eye size={13} className="text-ink-3" />
            {observedCount} observed
          </span>
          {telescope && (
            <span className="flex items-center gap-1.5">
              <Telescope size={13} className="text-ink-3" />
              {telescope.aperture_mm
                ? `${telescope.aperture_mm} mm`
                : telescope.name}
            </span>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
