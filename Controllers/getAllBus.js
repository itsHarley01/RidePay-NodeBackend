const db = require('../config/firebase');

// Get All Buses Controller
const getAllBuses = async (req, res) => {
  try {
    const snapshot = await db.ref('r1d3-py_d4tts/bus').once('value');
    const buses = snapshot.val();

    if (!buses) {
      return res.status(200).json([]);
    }

    // Convert object to array
    const busList = Object.values(buses);

    return res.status(200).json(busList);
  } catch (error) {
    console.error('Error fetching buses:', error);
    return res.status(500).json({ error: 'Failed to fetch buses' });
  }
};

module.exports = { getAllBuses };
