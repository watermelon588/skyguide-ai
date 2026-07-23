const fs = require("fs/promises");
const path = require("path");

const GalleryPost = require("../models/GalleryPost");

/**
 * Community gallery business logic.
 *
 * STORAGE (deliberately swappable): files live on the gateway's own disk under
 * `uploads/gallery/` and are served as static files. The database stores only a
 * FILENAME, and `publicUrl()` below is the single place that turns one into a
 * URL — so moving to S3/Cloudinary later means rewriting that one function and
 * the multer destination, with no data migration and no frontend change.
 *
 * Note this is the gateway's disk, NOT the frontend's `src/`: uploads arrive at
 * runtime, and anything written into a Vite `src/` tree after build is invisible
 * to the served bundle (and impossible on a static host).
 */

// Resolved from this file so it doesn't depend on the process working directory.
const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads", "gallery");
const PUBLIC_PREFIX = "/uploads/gallery";

/** The number of posts the gallery's featured strip shows. */
const TOP_COUNT = 10;

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/** Ensure the upload directory exists (first run, or after a wiped disk). */
async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  return UPLOAD_DIR;
}

/** Browser-facing URL for a stored file. The ONLY place this mapping lives. */
function publicUrl(filename) {
  return `${PUBLIC_PREFIX}/${filename}`;
}

/**
 * Shape one post for the client.
 *
 * `likedByMe` is resolved server-side so the client never receives the full
 * liker list — that would leak who liked what across the whole community.
 */
function serialize(post, viewerId) {
  const author = post.user && typeof post.user === "object" ? post.user : null;

  return {
    id: String(post._id),
    url: publicUrl(post.filename),
    caption: post.caption || "",
    likeCount: post.likeCount ?? 0,
    likedByMe: viewerId
      ? (post.likes || []).some((id) => String(id) === String(viewerId))
      : false,
    createdAt: post.createdAt,
    author: author
      ? {
          username: author.username,
          displayName: author.displayName || "",
          avatar: author.avatar || "",
        }
      : null,
    isMine: viewerId ? String(post.user?._id ?? post.user) === String(viewerId) : false,
  };
}

const AUTHOR_FIELDS = "username displayName avatar";

/**
 * The gallery feed.
 *
 * @param {object}  opts
 * @param {string?} opts.viewerId  signed-in viewer, or null
 * @param {string}  opts.sort      "top" (most liked) | "recent"
 * @param {number}  opts.limit
 */
async function listPosts({ viewerId = null, sort = "top", limit = 60 } = {}) {
  const order =
    sort === "recent" ? { createdAt: -1 } : { likeCount: -1, createdAt: -1 };

  const posts = await GalleryPost.find()
    .sort(order)
    .limit(Math.min(Number(limit) || 60, 100))
    .populate("user", AUTHOR_FIELDS)
    .lean();

  return posts.map((post) => serialize(post, viewerId));
}

/** The featured strip: the ten most-liked photos. */
async function listTopPosts(viewerId = null) {
  return listPosts({ viewerId, sort: "top", limit: TOP_COUNT });
}

/** Record an upload that multer has already written to disk. */
async function createPost({ userId, filename, caption }) {
  const post = await GalleryPost.create({
    user: userId,
    filename,
    caption: typeof caption === "string" ? caption.trim().slice(0, 140) : "",
  });

  await post.populate("user", AUTHOR_FIELDS);
  return serialize(post.toObject(), userId);
}

/**
 * Toggle the viewer's like.
 *
 * Uses a single atomic update per branch rather than read-modify-write: two
 * rapid taps from the same user would otherwise race and leave `likeCount`
 * disagreeing with `likes`. `$addToSet`/`$pull` make the array idempotent, and
 * the count is only adjusted when the array actually changed.
 */
async function toggleLike(postId, userId) {
  const post = await GalleryPost.findById(postId);
  if (!post) throw httpError(404, "Photo not found.");

  const alreadyLiked = post.likes.some((id) => String(id) === String(userId));

  const updated = await GalleryPost.findByIdAndUpdate(
    postId,
    alreadyLiked
      ? { $pull: { likes: userId }, $inc: { likeCount: -1 } }
      : { $addToSet: { likes: userId }, $inc: { likeCount: 1 } },
    { new: true },
  ).populate("user", AUTHOR_FIELDS);

  return serialize(updated.toObject(), userId);
}

/** Delete one's own photo, removing the file as well as the record. */
async function deletePost(postId, userId) {
  const post = await GalleryPost.findById(postId);
  if (!post) throw httpError(404, "Photo not found.");
  if (String(post.user) !== String(userId)) {
    throw httpError(403, "You can only delete your own photos.");
  }

  await GalleryPost.findByIdAndDelete(postId);

  // Best-effort: a missing file must not fail the delete, or a half-cleaned
  // state becomes permanently undeletable.
  try {
    await fs.unlink(path.join(UPLOAD_DIR, post.filename));
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.error("Gallery file cleanup failed:", err.message);
    }
  }

  return { id: postId };
}

/** Photos by one observer — powers the "my uploads" strip on the profile. */
async function listByUser(username, viewerId = null) {
  const User = require("../models/Users");
  const user = await User.findOne({ username: String(username).toLowerCase() });
  if (!user) throw httpError(404, "Observer not found.");

  const posts = await GalleryPost.find({ user: user._id })
    .sort({ createdAt: -1 })
    .populate("user", AUTHOR_FIELDS)
    .lean();

  return posts.map((post) => serialize(post, viewerId));
}

module.exports = {
  UPLOAD_DIR,
  PUBLIC_PREFIX,
  TOP_COUNT,
  ensureUploadDir,
  publicUrl,
  listPosts,
  listTopPosts,
  createPost,
  toggleLike,
  deletePost,
  listByUser,
};
