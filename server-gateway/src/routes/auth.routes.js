const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const { authLimiter, } = require("../middleware/rateLimiter");

router.post("/register", authLimiter, authController.register);
router.post("/login", authLimiter, authController.login);
router.post("/logout", authLimiter, authController.logout); // Clear credentials completely
router.post("/forgot-password", authLimiter, authController.forgotPassword);
router.patch("/reset-password/:token", authLimiter, authController.resetPassword);

// Email verification by 6-digit code. Both are authenticated: sign-up now logs
// the observer in immediately, so verification happens from inside the app
// rather than via an emailed link. (Replaces GET /verify-email/:token and
// POST /resend-verification, which sent a URL that rendered raw JSON.)
// authLimiter also caps code guesses.
router.post("/verify-code", authLimiter, protect, authController.verifyCode);
router.post(
  "/send-verification-code",
  authLimiter,
  protect,
  authController.sendVerificationCode
);

// Temporary testing route
router.get("/me", protect, (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
});

module.exports = router;