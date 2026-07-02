const express = require("express");
const { chat } = require("../controllers/chatcontroller");

const router = express.Router();

router.post("/", chat);

module.exports = router;