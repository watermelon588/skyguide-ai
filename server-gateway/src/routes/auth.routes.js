const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const { authLimiter, } = require("../middleware/rateLimiter");

router.post("/register", authLimiter, authController.register);
router.post("/login", authLimiter, authController.login);
router.post("/logout", authLimiter, authController.logout); // Clear credentials completely
router.get("/verify-email/:token", authController.verifyEmail);
router.post("/forgot-password", authLimiter, authController.forgotPassword);
router.patch("/reset-password/:token", authLimiter, authController.resetPassword);
router.post("/resend-verification", authLimiter, authController.resendVerification);

// Temporary testing route
router.get("/me", protect, (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
});

module.exports = router;