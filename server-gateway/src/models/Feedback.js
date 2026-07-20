const mongoose = require("mongoose");

/**
 * A piece of user feedback from the footer form.
 *
 * Stored (not just emailed) so nothing is lost if mail delivery hiccups, and so
 * a simple review view is possible later. Works signed-out too — `user` is
 * optional and `email` is captured for a reply when the sender chose to leave
 * one.
 */
const FeedbackSchema = new mongoose.Schema(
  {
    // Present when the sender was signed in; null for anonymous footer feedback.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    category: {
      type: String,
      enum: ["idea", "bug", "praise", "other"],
      default: "other",
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    /** Optional reply-to address (validated loosely; may be blank). */
    email: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },

    /** The page the feedback was sent from, for context. */
    page: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },

    status: {
      type: String,
      enum: ["open", "reviewed"],
      default: "open",
      index: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Feedback", FeedbackSchema);
