const path = require("path");
const crypto = require("crypto");

const express = require("express");
const multer = require("multer");

const galleryController = require("../controllers/galleryController");
const galleryService = require("../services/galleryService");
const { protect, optionalAuth } = require("../middleware/authMiddleware");
const { galleryUploadLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB — astrophotography is big.

// Only real image types, checked by MIME. The extension is taken from this
// allowlist rather than from the client's filename, so a "photo.jpg.html"
// cannot be written to disk and later served as markup.
const ALLOWED_TYPES = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    try {
      cb(null, await galleryService.ensureUploadDir());
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    // Random name, server-chosen extension. NEVER file.originalname: it is
    // attacker-controlled and can contain path separators ("../../app.js"),
    // which is the classic path-traversal write.
    const ext = ALLOWED_TYPES.get(file.mimetype) || ".jpg";
    const name = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_TYPES.has(file.mimetype)) {
      const err = new Error("Only JPEG, PNG and WEBP images can be shared.");
      err.status = 400;
      return cb(err);
    }
    cb(null, true);
  },
});

/**
 * Translate multer's own errors into the app's response shape.
 *
 * Without this, exceeding the size limit surfaces as a generic 500 ("File too
 * large") with no guidance, and in production the global handler would replace
 * even that with "Internal Server Error".
 */
function handleUploadErrors(err, _req, res, next) {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? `That image is too large. Maximum size is ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.`
        : "That upload couldn't be processed.";
    return res.status(400).json({ success: false, message });
  }
  return next(err);
}

// --- Public reads. optionalAuth so `likedByMe`/`isMine` resolve for a signed-in
// viewer, while signed-out visitors can still browse the gallery. ---
router.get("/", optionalAuth, galleryController.list);
router.get("/top", optionalAuth, galleryController.top);
router.get("/observer/:username", optionalAuth, galleryController.byUser);

// --- Authenticated writes. ---
router.post(
  "/",
  protect,
  galleryUploadLimiter,
  upload.single("image"),
  handleUploadErrors,
  galleryController.upload,
);
router.post("/:id/like", protect, galleryController.like);
router.delete("/:id", protect, galleryController.remove);

module.exports = router;
