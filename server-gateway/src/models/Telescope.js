const mongoose = require("mongoose");

/**
 * Telescope configuration (dedicated collection).
 *
 * One active telescope per user — enforced by the unique `userId` index. A user
 * saving again upserts this single document (see telescopeService). Derived
 * science (focal ratio, limiting magnitude, recommended targets…) is authored
 * by the backend / Astro Engine, never trusted from the client:
 *   - `focal_ratio` is recomputed on every write from aperture + focal length.
 *   - `reserved` is a placeholder the Recommendation Engine (Session 12+) fills.
 *
 * Field names intentionally mirror the Session 10 frontend draft (e.g.
 * `cameraSupport`) so the existing UI persists and reloads with no mapping.
 */

// Type / mount vocabularies mirror the frontend dropdown options
// (frontend/src/data/demoTelescopes.js). Kept in sync so the authoritative
// backend never rejects a value the UI can produce.
const TELESCOPE_TYPES = [
  "Refractor",
  "Reflector",
  "Dobsonian",
  "Maksutov",
  "Schmidt-Cassegrain",
  "Ritchey-Chretien",
  "Newtonian",
  "Binocular",
  "Smart Telescope",
  "Custom",
];

const MOUNT_TYPES = [
  "Alt-Az",
  "Equatorial",
  "Dobsonian",
  "German EQ",
  "Fork",
  "GoTo",
  "Custom",
];

// Reserved for the Recommendation Engine. Populated later; never set by clients.
const ReservedSchema = new mongoose.Schema(
  {
    limiting_magnitude: { type: Number, default: null },
    field_of_view: { type: Number, default: null },
    recommended_targets: { type: [String], default: [] },
    eyepieces: { type: [mongoose.Schema.Types.Mixed], default: [] },
    filters: { type: [mongoose.Schema.Types.Mixed], default: [] },
    sensor_size: { type: Number, default: null },
  },
  { _id: false }
);

const TelescopeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    brand: {
      type: String,
      required: [true, "Brand is required."],
      trim: true,
      maxlength: 100,
    },

    model: {
      type: String,
      required: [true, "Model is required."],
      trim: true,
      maxlength: 100,
    },

    nickname: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100,
    },

    type: {
      type: String,
      required: [true, "Telescope type is required."],
      enum: {
        values: TELESCOPE_TYPES,
        message: "Unsupported telescope type.",
      },
    },

    aperture_mm: {
      type: Number,
      required: [true, "Aperture is required."],
      min: [10, "Aperture is too small."],
      max: [20000, "Aperture is too large."],
    },

    focal_length_mm: {
      type: Number,
      required: [true, "Focal length is required."],
      min: [50, "Focal length is too small."],
      max: [100000, "Focal length is too large."],
    },

    // Backend-authoritative — recomputed on every write, never trusted from client.
    focal_ratio: {
      type: Number,
      default: null,
    },

    mount: {
      type: String,
      required: [true, "Mount is required."],
      enum: {
        values: MOUNT_TYPES,
        message: "Unsupported mount type.",
      },
    },

    tracking: { type: Boolean, default: false },

    goto: { type: Boolean, default: false },

    // camelCase to match the Session 10 frontend draft shape (do not rename).
    cameraSupport: { type: Boolean, default: false },

    weight_kg: {
      type: Number,
      default: null,
      min: [0, "Weight cannot be negative."],
    },

    notes: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },

    reserved: {
      type: ReservedSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

TelescopeSchema.set("toJSON", {
  transform(_doc, ret) {
    delete ret.__v;
    return ret;
  },
});

const Telescope = mongoose.model("Telescope", TelescopeSchema);

Telescope.TELESCOPE_TYPES = TELESCOPE_TYPES;
Telescope.MOUNT_TYPES = MOUNT_TYPES;

module.exports = Telescope;
