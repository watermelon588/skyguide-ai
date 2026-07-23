const mongoose = require("mongoose");

/**
 * A photo an observer shared with the community.
 *
 * `likes` stores the user ids rather than a bare counter so "have I liked
 * this?" is answerable without a second collection, and a double-tap can never
 * inflate the count. `likeCount` is denormalized alongside it purely so the
 * "top 10 most liked" query can sort on an INDEXED field — recomputing a count
 * from an array at sort time would mean an aggregation on every gallery load.
 * Both are written together in galleryService; never update one alone.
 */
const GalleryPostSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Filename only — NOT a full URL. The public path is built at read time
    // from the current mount point, so moving storage (to S3, a CDN, anywhere)
    // is a change in one service function rather than a data migration.
    filename: {
      type: String,
      required: true,
    },

    caption: {
      type: String,
      trim: true,
      maxlength: 140,
      default: "",
    },

    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    likeCount: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  { timestamps: true },
);

// The gallery's headline query: most-liked first, newest breaking ties.
GalleryPostSchema.index({ likeCount: -1, createdAt: -1 });

module.exports = mongoose.model("GalleryPost", GalleryPostSchema);
