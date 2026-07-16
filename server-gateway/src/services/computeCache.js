const ComputeCache = require("../models/ComputeCache");

/**
 * Stale-while-revalidate cache for expensive computed responses.
 *
 * The product rule this enforces: a user should see *something real* instantly,
 * never a blank panel waiting on a 4-second sky computation. So:
 *
 *   - FRESH  (age < freshMs)  -> serve stored value, do nothing.
 *   - STALE  (freshMs..staleMs) -> serve stored value NOW, recompute in the
 *                                  background so the next caller is fresh.
 *   - MISSING / too old        -> compute synchronously (the only time a caller
 *                                  actually waits), store, serve.
 *
 * The value is written to Mongo (models/ComputeCache), so it survives restarts
 * and is shared across gateway processes — and the third-party services behind
 * a compute (the LLM, the atlas, geocoders) are hit at most once per fresh
 * window instead of once per request.
 */

/** Keys currently being recomputed, so a burst of misses computes once. */
const inFlight = new Set();

/** How long past the stale window a row lives before the TTL monitor reaps it. */
const HARD_TTL_MS = 24 * 60 * 60 * 1000;

async function store(key, value, freshMs) {
  const now = new Date();
  await ComputeCache.updateOne(
    { key },
    {
      $set: {
        value,
        computedAt: now,
        // Live well beyond the fresh window so stale-serving still has a row to
        // read; the service, not the TTL, decides what counts as fresh.
        expiresAt: new Date(now.getTime() + freshMs + HARD_TTL_MS),
      },
    },
    { upsert: true },
  );
}

/**
 * Recompute in the background, de-duplicated by key. Never rejects — a failed
 * refresh just leaves the existing (stale) value in place for the next attempt.
 */
function revalidate(key, compute, freshMs) {
  if (inFlight.has(key)) return;
  inFlight.add(key);
  Promise.resolve()
    .then(compute)
    .then((value) => store(key, value, freshMs))
    .catch((err) => {
      console.error(`computeCache: background refresh failed for ${key}:`, err.message);
    })
    .finally(() => inFlight.delete(key));
}

/**
 * Return a cached value, computing it only when necessary.
 *
 * @param {string} key   fully qualifies what the value depends on
 * @param {object} opts
 * @param {number} opts.freshMs   below this age, serve without recomputing
 * @param {number} opts.staleMs   below this age, serve stale + refresh behind it
 * @param {() => Promise<any>} opts.compute  produces a fresh value
 * @returns {Promise<{ value:any, cached:boolean, computedAt:Date, stale:boolean }>}
 */
async function remember(key, { freshMs, staleMs, compute }) {
  let row = null;
  try {
    row = await ComputeCache.findOne({ key }).lean();
  } catch (err) {
    // A cache-read failure must never break the request — fall through to a
    // direct compute as if the cache were empty.
    console.error(`computeCache: read failed for ${key}:`, err.message);
  }

  if (row) {
    const ageMs = Date.now() - new Date(row.computedAt).getTime();
    if (ageMs < freshMs) {
      return { value: row.value, cached: true, computedAt: row.computedAt, stale: false };
    }
    if (ageMs < staleMs) {
      // Serve the slightly-old value immediately; freshen it behind the scenes.
      revalidate(key, compute, freshMs);
      return { value: row.value, cached: true, computedAt: row.computedAt, stale: true };
    }
  }

  // Nothing usable — this is the only path where the caller waits.
  const value = await compute();
  const computedAt = new Date();
  // Best-effort store; a write failure must not fail the request the user is
  // waiting on.
  store(key, value, freshMs).catch((err) =>
    console.error(`computeCache: store failed for ${key}:`, err.message),
  );
  return { value, cached: false, computedAt, stale: false };
}

/** Drop a key (e.g. when the underlying inputs change and must recompute now). */
async function invalidate(key) {
  try {
    await ComputeCache.deleteOne({ key });
  } catch (err) {
    console.error(`computeCache: invalidate failed for ${key}:`, err.message);
  }
}

module.exports = { remember, invalidate };
