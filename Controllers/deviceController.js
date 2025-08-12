const db = require('../config/firebase'); // This should be the initialized Realtime DB
const DEVICE_PATH = 'r1d3-py_devices';

// Helper to generate a custom UID (e.g., DEV-25-0001)
async function generateDeviceUID() {
  const snapshot = await db.ref(DEVICE_PATH).once('value');
  const devices = snapshot.val() || {};
  const count = Object.keys(devices).length + 1;
  return `DEV-25-${String(count).padStart(4, '0')}`;
}

// 📌 Add new device
const addDevice = async (req, res) => {
  try {
    const { deviceName, macAddress, status } = req.body;

    if (!deviceName || !macAddress || !status) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const deviceUID = await generateDeviceUID();
    const newDevice = {
      deviceUID,
      deviceName,
      macAddress,
      status,
      createdAt: new Date().toISOString(),
    };

    await db.ref(`${DEVICE_PATH}/${deviceUID}`).set(newDevice);

    return res.status(201).json({ message: 'Device added successfully', device: newDevice });
  } catch (error) {
    console.error('Error adding device:', error);
    return res.status(500).json({ message: 'Server error while adding device' });
  }
};

// 📌 Get all devices
const getAllDevices = async (req, res) => {
  try {
    const snapshot = await db.ref(DEVICE_PATH).once('value');
    const data = snapshot.val();

    if (!data) return res.status(200).json([]);

    const devices = Object.values(data);
    return res.status(200).json(devices);
  } catch (error) {
    console.error('Error getting devices:', error);
    return res.status(500).json({ message: 'Server error while fetching devices' });
  }
};

// 📌 Get device by UID
const getDeviceByUID = async (req, res) => {
  try {
    const { uid } = req.params;

    const snapshot = await db.ref(`${DEVICE_PATH}/${uid}`).once('value');
    const device = snapshot.val();

    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    return res.status(200).json(device);
  } catch (error) {
    console.error('Error getting device:', error);
    return res.status(500).json({ message: 'Server error while fetching device' });
  }
};

// 📌 Update device by UID
const updateDeviceByUID = async (req, res) => {
  try {
    const { uid } = req.params;
    const updates = req.body;

    await db.ref(`${DEVICE_PATH}/${uid}`).update(updates);

    return res.status(200).json({ message: 'Device updated successfully' });
  } catch (error) {
    console.error('Error updating device:', error);
    return res.status(500).json({ message: 'Server error while updating device' });
  }
};

module.exports = {
  addDevice,
  getAllDevices,
  getDeviceByUID,
  updateDeviceByUID,
};
