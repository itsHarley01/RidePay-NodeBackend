const express = require("express");
const router = express.Router();
const gpsController = require("../Controllers/gpsController");

router.post("/gps", gpsController.receiveGpsData);
router.get("/gps/:deviceId", gpsController.getGpsData);


module.exports = router;
