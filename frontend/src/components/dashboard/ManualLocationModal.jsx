import { motion, AnimatePresence } from "framer-motion";
import { FiMapPin, FiCrosshair, FiX } from "react-icons/fi";
import { useEffect, useState } from "react";
import { useLocation } from "../../hooks/useLocation";
import Button from "../ui/Button";

/* ---------- validation ---------- */

function isValidTimezone(tz) {
  if (!tz || typeof tz !== "string") return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function validate({ latitude, longitude, timezone }) {
  const errors = {};

  const lat = Number(latitude);
  if (latitude === "" || Number.isNaN(lat)) {
    errors.latitude = "Latitude is required.";
  } else if (lat < -90 || lat > 90) {
    errors.latitude = "Latitude must be between -90 and 90.";
  }

  const lng = Number(longitude);
  if (longitude === "" || Number.isNaN(lng)) {
    errors.longitude = "Longitude is required.";
  } else if (lng < -180 || lng > 180) {
    errors.longitude = "Longitude must be between -180 and 180.";
  }

  if (!timezone.trim()) {
    errors.timezone = "Timezone is required.";
  } else if (!isValidTimezone(timezone.trim())) {
    errors.timezone = "Enter a valid IANA timezone (e.g. Asia/Kolkata).";
  }

  return errors;
}

/* ---------- field ---------- */

function Field({ label, error, hint, ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-[#AAB4C5]">
        {label}
      </span>
      <input
        {...props}
        className="
          w-full rounded-lg border bg-white/5 px-3 py-2.5 text-sm text-white
          outline-none transition-colors placeholder:text-[#6B7280]
          focus:border-orange-500 focus:ring-1 focus:ring-orange-500
        "
        style={{ borderColor: error ? "#EF4444" : "rgba(255,255,255,0.1)" }}
      />
      {error ? (
        <span className="mt-1 block text-xs text-[#EF4444]">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-[#6B7280]">{hint}</span>
      ) : null}
    </label>
  );
}

/* ---------- modal ---------- */

/**
 * Manual observer-location entry.
 *
 * The inner form is mounted only while `open`, so its state seeds fresh from
 * `initial` on each open (no reset effect needed) and unmounts on close.
 *
 * @param {boolean} open
 * @param {() => void} onClose
 * @param {{ latitude?:number, longitude?:number, timezone?:string }} [initial]
 *        Prefill values (used when editing an existing location).
 */
export default function ManualLocationModal({ open, onClose, initial }) {
  return (
    <AnimatePresence>
      {open && <ManualLocationForm onClose={onClose} initial={initial} />}
    </AnimatePresence>
  );
}

/**
 * Reuses useLocation().saveLocation → PATCH /users/location. On success the
 * hook updates AuthContext, so the ObserverCard reflects the new values
 * immediately, and the modal animates closed.
 */
function ManualLocationForm({ onClose, initial }) {
  const { status, errorMessage, saveLocation } = useLocation();

  const [form, setForm] = useState(() => ({
    latitude: initial?.latitude != null ? String(initial.latitude) : "",
    longitude: initial?.longitude != null ? String(initial.longitude) : "",
    timezone: initial?.timezone ?? "",
  }));
  const [errors, setErrors] = useState({});

  // Close smoothly once the save succeeds.
  useEffect(() => {
    if (status !== "success") return;
    const timer = setTimeout(() => onClose(), 700);
    return () => clearTimeout(timer);
  }, [status, onClose]);

  const isBusy = status === "requesting";

  const setField = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const detectTimezone = () => {
    setForm((prev) => ({
      ...prev,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }));
    if (errors.timezone) setErrors((prev) => ({ ...prev, timezone: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isBusy) return;

    const nextErrors = validate(form);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    await saveLocation({
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      timezone: form.timezone.trim(),
      elevation_m: 0,
    });
  };

  return (
    <>
      <motion.div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
              className="
                w-full max-w-md rounded-2xl border border-white/10 bg-white/5
                px-8 py-6 shadow-2xl backdrop-blur-3xl
              "
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-orange-400/20 bg-orange-500/15">
                    <FiMapPin className="text-xl text-orange-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      Enter Location Manually
                    </h2>
                    <p className="text-xs text-[#6B7280]">
                      Provide your observing coordinates
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  aria-label="Close"
                >
                  <FiX className="text-lg" />
                </Button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="Latitude"
                    type="text"
                    inputMode="decimal"
                    placeholder="22.5726"
                    value={form.latitude}
                    onChange={setField("latitude")}
                    error={errors.latitude}
                  />
                  <Field
                    label="Longitude"
                    type="text"
                    inputMode="decimal"
                    placeholder="88.3639"
                    value={form.longitude}
                    onChange={setField("longitude")}
                    error={errors.longitude}
                  />
                </div>

                <div>
                  <Field
                    label="Timezone"
                    type="text"
                    placeholder="Asia/Kolkata"
                    value={form.timezone}
                    onChange={setField("timezone")}
                    error={errors.timezone}
                    hint="IANA name, e.g. Europe/London"
                  />
                  <button
                    type="button"
                    onClick={detectTimezone}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-orange-400 transition-colors hover:text-orange-300"
                  >
                    <FiCrosshair className="text-sm" />
                    Detect from browser
                  </button>
                </div>

                <AnimatePresence>
                  {status === "error" && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-sm text-[#EF4444]"
                    >
                      {errorMessage}
                    </motion.p>
                  )}
                  {status === "success" && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-sm text-[#22C55E]"
                    >
                      Location saved.
                    </motion.p>
                  )}
                </AnimatePresence>

                <div className="mt-2 flex gap-3">
                  <Button
                    variant="secondary"
                    onClick={onClose}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isBusy}
                    className="flex-1"
                  >
                    {isBusy
                      ? "Saving..."
                      : status === "success"
                        ? "Saved"
                        : "Save Location"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
    </>
  );
}
