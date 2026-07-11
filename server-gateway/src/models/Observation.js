const mongoose = require("mongoose");

/**
 * One entry in a user's observation planner.
 *
 * Lifecycle: planned -> observed | skipped. An object may appear once per
 * user while planned (enforced by a partial unique index); once resolved it
 * becomes history, and the same object can be planned again — so the log can
 * hold "observed M42 in January AND in March".
 *
 * Celestial data (name, type, coordinates) is NOT duplicated here — the
 * catalog on the Astro Engine owns it. This collection stores only the
 * user's intent and experience around a catalog_id.
 */
const ObservationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    catalog_id: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 20,
    },

    status: {
      type: String,
      enum: ["planned", "observed", "skipped"],
      default: "planned",
      index: true,
    },

    notes: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },

    /** 1 (highest) – 5 (lowest); presentation-level ordering hint. */
    priority: {
      type: Number,
      min: 1,
      max: 5,
      default: 3,
    },

    /** Set when status moves to observed/skipped. */
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// One *planned* entry per object per user; resolved history may repeat.
ObservationSchema.index(
  { user: 1, catalog_id: 1 },
  { unique: true, partialFilterExpression: { status: "planned" } }
);

// The common list query: a user's entries, newest first within a status.
ObservationSchema.index({ user: 1, status: 1, createdAt: -1 });

ObservationSchema.methods.toJSON = function () {
  const doc = this.toObject();
  delete doc.__v;
  delete doc.user; // the caller already knows whose list this is
  return doc;
};

module.exports = mongoose.model("Observation", ObservationSchema);
