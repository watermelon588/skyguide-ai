const express = require("express");

const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const {
  getNearby,
  getRooms,
  getRoomMessages,
  sendPing,
  getPings,
  respondToPing,
  blockUser,
  unblockUser,
  getBlocks,
  reportMessage,
} = require("../controllers/communityController");

// Every community route is members-only.
router.use(protect);

// --- Discovery ---
// Nearby observers (needs the viewer's own location to anchor the $geoNear).
router.get("/nearby", getNearby);

// --- Rooms ---
// Rooms available to the viewer: their region + any accepted private rooms.
router.get("/rooms", getRooms);

// Room history. Live messages come over the socket; history is REST so
// pagination stays simple and cacheable.
router.get("/rooms/:key/messages", getRoomMessages);

// --- Pings (the consent gate in front of direct messages) ---
router.post("/pings", sendPing);
router.get("/pings", getPings);
router.patch("/pings/:id", respondToPing);

// --- Safety ---
router.get("/blocks", getBlocks);
router.post("/blocks", blockUser);
router.delete("/blocks/:username", unblockUser);
router.post("/reports", reportMessage);

module.exports = router;
