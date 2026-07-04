const express = require("express");

const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { updateLocation } = require("../controllers/userController");

router.patch(
    "/location",
    protect,
    updateLocation
);

module.exports = router;