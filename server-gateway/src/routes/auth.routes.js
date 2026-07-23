const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const {
  authLimiter,
  loginLimiter,
  otpLimiter,
  passwordResetLimiter,
  resetRedeemLimiter,
} = require("../middleware/rateLimiter");

// authLimiter stays as the broad traffic guard on every auth route; the
// narrower limiters stack on top of it for the three endpoints that are worth
// attacking specifically (password guessing, OTP guessing, mail flooding).
router.post("/register", authLimiter, authController.register);
router.post("/login", authLimiter, loginLimiter, authController.login);
router.post("/logout", authLimiter, authController.logout); // Clear credentials completely
router.post(
  "/forgot-password",
  authLimiter,
  passwordResetLimiter,
  authController.forgotPassword
);
router.patch(
  "/reset-password/:token",
  authLimiter,
  resetRedeemLimiter,
  authController.resetPassword
);

// Email verification by 6-digit code. Both are authenticated: sign-up now logs
// the observer in immediately, so verification happens from inside the app
// rather than via an emailed link. (Replaces GET /verify-email/:token and
// POST /resend-verification, which sent a URL that rendered raw JSON.)
// otpLimiter goes AFTER protect so it can key on the authenticated user rather
// than a shared IP — see its comment in rateLimiter.js.
router.post(
  "/verify-code",
  authLimiter,
  protect,
  otpLimiter,
  authController.verifyCode
);
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