const express = require("express");

const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const {
    getTelescope,
    saveTelescope,
    deleteTelescope,
} = require("../controllers/telescopeController");

// One active telescope per authenticated user. POST and PATCH both upsert.
router.get("/", protect, getTelescope);
router.post("/", protect, saveTelescope);
router.patch("/", protect, saveTelescope);
router.delete("/", protect, deleteTelescope);

module.exports = router;
