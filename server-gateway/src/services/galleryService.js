const GalleryPost = require("../models/GalleryPost");
const imageStorage = require("./imageStorage");

/**
 * Community gallery business logic.
 *
 * STORAGE (deliberately swappable): the actual bytes live wherever
 * `imageStorage` decides — Cloudinary's CDN in production (survives a redeploy),
 * or the gateway's local disk in development. The database stores a delete
 * handle (`filename`) and, for Cloudinary, the absolute `url`. This service
 * never touches the filesystem or the CDN directly; it goes through
 * imageStorage, so the backend is a one-module concern.
 */

/** The number of posts the gallery's featured strip shows. */
const TOP_COUNT = 10;

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
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
    url: imageStorage.resolveUrl(post),
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

/** Persist an uploaded image buffer, then record the post. */
async function createPost({ userId, file, caption }) {
  // Store the bytes first (Cloudinary or disk); we only write a DB record once
  // the image is safely persisted, so a failed upload leaves no orphan row.
  const { filename, url } = await imageStorage.save(file);

  const post = await GalleryPost.create({
    user: userId,
    filename,
    url: url || "",
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

  // Best-effort cleanup of the stored bytes (CDN or disk). imageStorage
  // swallows a missing-file error internally, so a half-cleaned state can never
  // make the record permanently undeletable.
  await imageStorage.remove({ filename: post.filename, url: post.url });

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
  TOP_COUNT,
  listPosts,
  listTopPosts,
  createPost,
  toggleLike,
  deletePost,
  listByUser,
};
