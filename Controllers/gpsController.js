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
