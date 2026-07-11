const express = require("express");

const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const {
  listObservations,
  addObservation,
  updateObservation,
  removeObservation,
} = require("../controllers/observationController");

// Every planner route is per-user — authentication is non-negotiable.
router.use(protect);

router.get("/", listObservations);
router.post("/", addObservation);
router.patch("/:id", updateObservation);
router.delete("/:id", removeObservation);

module.exports = router;
