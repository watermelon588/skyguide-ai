const mongoose = require("mongoose");

/**
 * One chat message in a community room.
 *
 * `room` stores the room KEY (not an ObjectId ref) — rooms are identified by a
 * derivable key ("geo:tunb" for a region, "dm:<idA>_<idB>" for a private pair),
 * so a message can be written without a room lookup, and history survives a
 * room doc being recreated.
 *
 * Retention: the newest 500 per room (see communityService.pruneRoom). Chosen
 * over a 30-day TTL because a quiet regional room would otherwise erase itself
 * to nothing between clear nights — a cap keeps the room's history intact
 * regardless of how slowly it moves.
 */
const MessageSchema = new mongoose.Schema(
  {
    room: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// The history query: one room's messages, newest first, paginated by createdAt.
MessageSchema.index({ room: 1, createdAt: -1 });

module.exports = mongoose.model("Message", MessageSchema);
