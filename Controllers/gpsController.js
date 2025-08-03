const db = require("../config/firebase");

exports.receiveGpsData = async (req, res) => {
  try {
    const { deviceId, long, lat, speed } = req.body;

    if (!deviceId || !long || !lat || !speed) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const timestamp = Date.now();

    const refPath = `r1d3-py_d4tts/devices/${deviceId}`;
    await db.ref(refPath).update({
      long,
      lat,
      speed,
      timestamp,
    });

    return res.status(200).json({ message: "GPS data saved successfully." });
  } catch (error) {
    console.error("Error receiving GPS data:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// in controllers/gpsController.js
exports.getGpsData = async (req, res) => {
  try {
    const { deviceId } = req.params;
    if (!deviceId) {
      return res.status(400).json({ message: "Missing deviceId" });
    }

    const refPath = `r1d3-py_d4tts/devices/${deviceId}`;
    const snapshot = await db.ref(refPath).once("value");
    const data = snapshot.val();

    if (!data) {
      return res.status(404).json({ message: "Device not found" });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("Error getting GPS data:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

