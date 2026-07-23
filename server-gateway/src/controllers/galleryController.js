const galleryService = require("../services/galleryService");

/**
 * Community gallery controller — thin HTTP shaping only.
 * All rules (ownership, like toggling, storage paths) live in galleryService.
 */

/** GET /api/v1/gallery?sort=top|recent&limit=  — public. */
exports.list = async (req, res, next) => {
  try {
    const posts = await galleryService.listPosts({
      viewerId: req.user?._id ?? null,
      sort: req.query.sort === "recent" ? "recent" : "top",
      limit: req.query.limit,
    });
    res.status(200).json({ success: true, data: { posts } });
  } catch (error) {
    next(error);
  }
};

/** GET /api/v1/gallery/top — the ten most-liked. Public. */
exports.top = async (req, res, next) => {
  try {
    const posts = await galleryService.listTopPosts(req.user?._id ?? null);
    res.status(200).json({ success: true, data: { posts } });
  } catch (error) {
    next(error);
  }
};

/** GET /api/v1/gallery/observer/:username — one observer's photos. Public. */
exports.byUser = async (req, res, next) => {
  try {
    const posts = await galleryService.listByUser(
      req.params.username,
      req.user?._id ?? null,
    );
    res.status(200).json({ success: true, data: { posts } });
  } catch (error) {
    next(error);
  }
};

/** POST /api/v1/gallery — multipart upload. Authenticated. */
exports.upload = async (req, res, next) => {
  try {
    // multer populates req.file; its absence means the field was missing or the
    // fileFilter rejected the type.
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Choose a JPEG, PNG or WEBP image to share.",
      });
    }

    const post = await galleryService.createPost({
      userId: req.user._id,
      filename: req.file.filename,
      caption: req.body.caption,
    });

    res.status(201).json({ success: true, data: { post } });
  } catch (error) {
    next(error);
  }
};

/** POST /api/v1/gallery/:id/like — toggle. Authenticated. */
exports.like = async (req, res, next) => {
  try {
    const post = await galleryService.toggleLike(req.params.id, req.user._id);
    res.status(200).json({ success: true, data: { post } });
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/v1/gallery/:id — own photos only. Authenticated. */
exports.remove = async (req, res, next) => {
  try {
    const result = await galleryService.deletePost(req.params.id, req.user._id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
