const mongoose = require("mongoose");

/**
 * A durable cache for expensive computed responses (recommendations, the
 * nightly brief, and anything else that costs an astronomy pipeline or a
 * third-party call to produce).
 *
 * Why it exists: a user should never watch a blank panel while the engine
 * recomputes their sky from scratch. A five-minute-old sky is a better product
 * than a spinner — so once anything is computed it is stored here and served
 * instantly, and refreshed in the background (see services/computeCache.js for
 * the stale-while-revalidate policy). It also spares the third-party services
 * (Groq, the atlas, geocoders) a call on every single request.
 *
 * `key` encodes exactly what the value depends on — e.g.
 * `recs:<userId>:<lat.2>,<lon.2>:<scopeSig>` — so a location or telescope change
 * misses and recomputes, while a page refresh hits.
 *
 * `expiresAt` drives a TTL index: entries evaporate a safe while after they stop
 * being useful, so the collection can never grow without bound. It is set well
 * beyond the "fresh" window; the service decides freshness, Mongo only reaps the
 * truly dead.
 */
const ComputeCacheSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    /** The cached response payload, verbatim. */
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    /** When this value was actually computed — the age the service reasons about. */
    computedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },

    /** Hard expiry for the TTL monitor (see the index below). */
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

// TTL: Mongo removes a document once `expiresAt` passes. `expireAfterSeconds: 0`
// means "at the instant stored in the field".
ComputeCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("ComputeCache", ComputeCacheSchema);
