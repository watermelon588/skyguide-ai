const mongoose = require("mongoose");

/**
 * One observer blocking another (Feature 6c).
 *
 * A block is stored one-directional (who pressed the button) but ENFORCED
 * symmetrically: neither party sees the other in discovery, in room messages,
 * or in pings. Storing it one-way keeps "who blocked whom" honest — useful if
 * moderation ever needs it — while the service always queries both directions.
 *
 * See communityService.blockedIdsFor().
 */
const BlockSchema = new mongoose.Schema(
  {
    blocker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    blocked: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Blocking twice is a no-op, not an error.
BlockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });

module.exports = mongoose.model("Block", BlockSchema);
