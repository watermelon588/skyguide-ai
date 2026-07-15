const mongoose = require("mongoose");

/**
 * One in-app notification (Feature 7).
 *
 * `sentKey` is the idempotency guard and the reason this collection is safe to
 * drive from a cron. It encodes "this exact notification, for this user, for
 * this occasion" — e.g. `digest:2026-07-15:<userId>`. A unique index means a
 * restart, an overlapping tick, or a retry can attempt the same send and lose
 * the race harmlessly (duplicate key) instead of spamming the observer.
 *
 * `data` is a free-form payload the UI uses to deep-link (e.g. a catalog_id) —
 * kept out of `body` so copy changes never break navigation.
 */
const NotificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["digest", "great_night", "iss_pass", "plan_urgency", "moon"],
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 600,
    },

    /** Deep-link / render payload, e.g. { href: "/tonight", score: 82 }. */
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    /** Idempotency token — see the class note above. */
    sentKey: {
      type: String,
      required: true,
    },

    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// The guard: one notification per occasion, forever.
NotificationSchema.index({ sentKey: 1 }, { unique: true });

// The list query: a user's notifications, newest first.
NotificationSchema.index({ user: 1, createdAt: -1 });

NotificationSchema.methods.toJSON = function () {
  const doc = this.toObject();
  return {
    id: String(doc._id),
    type: doc.type,
    title: doc.title,
    body: doc.body,
    data: doc.data || {},
    read: Boolean(doc.readAt),
    createdAt: doc.createdAt,
  };
};

module.exports = mongoose.model("Notification", NotificationSchema);
