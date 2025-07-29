const db = require('../config/firebase');

// ✅ Get all drivers
const getAllDrivers = async (req, res) => {
  try {
    const snapshot = await db.ref('r3g1s_user_us3r_4cc5').once('value');
    const data = snapshot.val() || {};

    const drivers = Object.entries(data)
      .filter(([uid, user]) => user.role === 'driver')
      .map(([uid, user]) => ({
        uid,
        ...user,
      }));

    res.status(200).json(drivers);
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
};

// ✅ Get driver by UID
const getDriverById = async (req, res) => {
  try {
    const uid = req.params.id;
    const snapshot = await db.ref(`r3g1s_user_us3r_4cc5/${uid}`).once('value');
    const user = snapshot.val();

    if (!user || user.role !== 'driver') {
      return res.status(404).json({ error: 'Driver not found' });
    }

    res.status(200).json({ uid, ...user });
  } catch (error) {
    console.error('Error fetching driver by ID:', error);
    res.status(500).json({ error: 'Failed to fetch driver' });
  }
};

module.exports = {
  getAllDrivers,
  getDriverById,
};
