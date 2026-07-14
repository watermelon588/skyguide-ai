import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, ExternalLink } from "lucide-react";

import AvatarUploader from "../components/profile/AvatarUploader";
import StatsBand from "../components/profile/StatsBand";
import { useProfile } from "../hooks/useProfile";

/**
 * /profile — the observer's own, editable profile.
 *
 * Avatar and the privacy toggle save immediately (they feel like switches);
 * name / bio / visibility batch behind a Save button. Renders inside
 * AppLayout, so it inherits the app navbar.
 */

const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public", hint: "Anyone can view your profile" },
  { value: "observers", label: "Observers only", hint: "Only signed-in observers" },
  { value: "private", label: "Private", hint: "Only you" },
];

const inputClass =
  "w-full border border-line bg-surface-2 px-4 py-2.5 text-ink placeholder-ink-3 outline-none transition-colors focus:border-accent";

export default function Profile() {
  const { profile, isLoading, isError, update, setAvatar, clearAvatar } =
    useProfile();

  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);

  // Hydrate the editable form once the profile first arrives — the
  // adjust-state-on-render pattern (no effect, no cascade).
  if (profile && form === null) {
    setForm({
      displayName: profile.displayName,
      bio: profile.bio,
      profileVisibility: profile.profileVisibility,
    });
  }

  if (isLoading || !form) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-8">
        <div className="h-64 animate-pulse border border-line bg-surface-2" />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-8">
        <p className="border border-danger/30 bg-danger/10 px-5 py-4 text-sm text-danger">
          Couldn't load your profile — check the gateway and reload.
        </p>
      </div>
    );
  }

  const dirty =
    form.displayName !== profile.displayName ||
    form.bio !== profile.bio ||
    form.profileVisibility !== profile.profileVisibility;

  const onSave = () => {
    update.mutate(form, {
      onSuccess: () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      },
    });
  };

  const toggleApproxLocation = () =>
    update.mutate({ showApproxLocation: !profile.showApproxLocation });

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-accent">
            Your profile
          </p>
          <h1 className="mt-1 text-3xl font-bold text-ink">
            {profile.displayName || profile.username}
          </h1>
          <p className="text-sm text-ink-3">@{profile.username}</p>
        </div>
        <Link
          to={`/observers/${profile.username}`}
          className="flex shrink-0 items-center gap-1.5 border border-line bg-surface-2 px-4 py-2 text-sm text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink"
        >
          View public <ExternalLink size={13} />
        </Link>
      </div>

      <div className="space-y-4">
        {/* Avatar */}
        <section className="border border-line bg-surface-2 p-6">
          <AvatarUploader
            avatar={profile.avatar}
            name={profile.displayName || profile.username}
            busy={setAvatar.isPending || clearAvatar.isPending}
            onSelect={(dataUrl) => setAvatar.mutate(dataUrl)}
            onClear={() => clearAvatar.mutate()}
          />
          {setAvatar.isError && (
            <p className="mt-3 text-xs text-danger">
              {setAvatar.error?.response?.data?.message ||
                "Upload failed — try a smaller image."}
            </p>
          )}
        </section>

        {/* Identity */}
        <section className="space-y-4 border border-line bg-surface-2 p-6">
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-ink-3">
              Display name
            </label>
            <input
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              maxLength={50}
              placeholder={profile.username}
              className={inputClass}
            />
          </div>
          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <label className="text-xs uppercase tracking-[0.2em] text-ink-3">
                Bio
              </label>
              <span className="text-[11px] text-ink-3">
                {form.bio.length}/280
              </span>
            </div>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              maxLength={280}
              rows={3}
              placeholder="Your gear, your skies, what you love to observe…"
              className={`${inputClass} resize-none`}
            />
          </div>
        </section>

        {/* Privacy */}
        <section className="space-y-4 border border-line bg-surface-2 p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-ink-3">
              Profile visibility
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {VISIBILITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    setForm({ ...form, profileVisibility: opt.value })
                  }
                  className={`border px-3 py-2.5 text-left transition-colors ${
                    form.profileVisibility === opt.value
                      ? "border-accent/50 bg-accent/10"
                      : "border-line bg-surface-2 hover:bg-surface-3"
                  }`}
                >
                  <span className="block text-sm font-semibold text-ink">
                    {opt.label}
                  </span>
                  <span className="block text-[11px] text-ink-3">
                    {opt.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-center justify-between gap-4 border border-line bg-surface-3 px-4 py-3">
            <span>
              <span className="block text-sm font-medium text-ink">
                Show my approximate location
              </span>
              <span className="block text-xs text-ink-3">
                {profile.place
                  ? `Shown as "${profile.place}" — never your exact coordinates`
                  : "A city/region label (set your location to populate it)"}
              </span>
            </span>
            <input
              type="checkbox"
              checked={profile.showApproxLocation}
              onChange={toggleApproxLocation}
              className="h-4 w-4 shrink-0 accent-[#0049CD]"
            />
          </label>
        </section>

        {/* Observing résumé */}
        <section className="border border-line bg-surface-2 p-6">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.3em] text-accent">
            Observing résumé
          </p>
          <StatsBand stats={profile.stats} showPlanned />
        </section>

        {/* Save bar */}
        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-success">
              <Check size={15} /> Saved
            </span>
          )}
          <motion.button
            type="button"
            whileHover={dirty ? { scale: 1.03 } : undefined}
            whileTap={dirty ? { scale: 0.97 } : undefined}
            onClick={onSave}
            disabled={!dirty || update.isPending}
            className="bg-accent px-6 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-accent-hi disabled:cursor-not-allowed disabled:opacity-40"
          >
            {update.isPending ? "Saving…" : "Save changes"}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
