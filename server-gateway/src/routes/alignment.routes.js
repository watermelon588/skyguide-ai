const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { createRoom } = require("../controllers/alignmentController");

router.post("/create-room", protect, createRoom);

module.exports = router;