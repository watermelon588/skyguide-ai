const mongoose = require("mongoose");

/**
 * A community chat room.
 *
 * Two kinds:
 *   region — one per geohash-4 cell (~39 km), auto-created the first time an
 *            observer in that cell opens chat. `key` = "geo:<geohash4>".
 *            Membership is NOT stored: it's derived from `User.geohash4`, so a
 *            member count can never drift out of sync with reality.
 *   direct — a private two-person room, created ONLY when a ping request is
 *            accepted. `key` = "dm:<idA>_<idB>" with the ids sorted, so the
 *            pair maps to exactly one room regardless of who pinged whom.
 *            Membership IS stored (`participants`) — there's no other way to
 *            derive who belongs to a private conversation.
 *
 * There is deliberately no global/everyone room: a single firehose channel is
 * the hardest thing to moderate and the least useful ("is it clear over the
 * river?" only means something locally).
 *
 * Region `name` is captured from the first member's reverse-geocoded city label
 * ("SkyGuide · Kolkata region") and then kept stable, so the room doesn't
 * rename itself as different people wander in. Direct rooms carry no stored
 * name — each participant sees the *other* person's name (resolved per viewer).
 */
const RoomSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    kind: {
      type: String,
      enum: ["region", "direct"],
      required: true,
    },

    /** Null for direct rooms. */
    geohash: {
      type: String,
      default: null,
      index: true,
    },

    /** Exactly the two members of a direct room; empty for region rooms. */
    participants: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
  },
  {
    timestamps: true,
  }
);

RoomSchema.methods.toJSON = function () {
  const doc = this.toObject();
  delete doc.__v;
  delete doc._id;
  return doc;
};

module.exports = mongoose.model("Room", RoomSchema);
