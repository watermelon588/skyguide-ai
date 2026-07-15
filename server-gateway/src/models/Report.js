const mongoose = require("mongoose");

/**
 * A reported message (Feature 6c).
 *
 * The offending text is SNAPSHOT here rather than referenced: room history is
 * capped at 500 messages, so the original can be pruned away — and a report
 * whose evidence has evaporated is useless to whoever reviews it. The message
 * id is kept too, for correlation while it still exists.
 *
 * There is no admin UI yet; this is the durable record that makes one
 * possible. Reports are write-only from the client's perspective.
 */
const ReportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    /** The message's author, denormalized so patterns are queryable. */
    reportedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    room: {
      type: String,
      required: true,
      trim: true,
    },

    /** Evidence snapshot — survives history pruning. */
    body: {
      type: String,
      required: true,
      maxlength: 500,
    },

    reason: {
      type: String,
      enum: ["spam", "harassment", "inappropriate", "other"],
      default: "other",
    },

    status: {
      type: String,
      enum: ["open", "reviewed"],
      default: "open",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// One report per reporter per message — re-reporting is a no-op.
ReportSchema.index({ reporter: 1, message: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Report", ReportSchema);
