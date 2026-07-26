const express = require("express");
const multer = require("multer");

const galleryController = require("../controllers/galleryController");
const imageStorage = require("../services/imageStorage");
const { protect, optionalAuth } = require("../middleware/authMiddleware");
const { galleryUploadLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB — astrophotography is big.

// In-memory storage: the buffer is handed to imageStorage, which persists it to
// Cloudinary (when configured) or local disk. Keeping it in memory means one
// upload path regardless of backend — and no temp file to clean up if the
// Cloudinary call fails. Bounded by the 8 MB `fileSize` limit below.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    // Only real image types, by MIME. The stored extension is server-chosen
    // from this allowlist, never the client's filename.
    if (!imageStorage.ALLOWED_TYPES.has(file.mimetype)) {
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
