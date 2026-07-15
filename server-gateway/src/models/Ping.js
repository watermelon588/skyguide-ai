const mongoose = require("mongoose");

/**
 * A chat request ("ping") from one observer to another.
 *
 * This is the consent gate in front of direct messages: you cannot message a
 * stranger, you can only ask. Only once `status` is "accepted" does a private
 * room exist for the pair. That's what keeps DMs from becoming an unmoderatable
 * surface — every conversation was invited by its recipient.
 *
 * Lifecycle: pending -> accepted | declined. A declined ping may be re-sent
 * later (the partial unique index only guards *pending* duplicates), but a
 * blocked user can't ping at all — that's enforced in the service.
 */
const PingSchema = new mongoose.Schema(
  {
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    /** Optional one-line note so the recipient knows who's asking and why. */
    note: {
      type: String,
      trim: true,
      default: "",
      maxlength: 140,
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
      index: true,
    },

    respondedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// At most one OPEN request per direction; re-pinging after a decline is fine.
PingSchema.index(
  { from: 1, to: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);

// The inbox query: my pending requests, newest first.
PingSchema.index({ to: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("Ping", PingSchema);
