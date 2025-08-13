const { db } = require('../config/firebase');

// Helper to pad numbers
const padNumber = (num) => num.toString().padStart(4, '0');

// Generate Unique Bus ID
const generateBusUID = async () => {
  try {
    const snapshot = await db.ref('r1d3-py_bus').once('value');
    const buses = snapshot.val() || {};
    const count = Object.keys(buses).length;
    const next = count + 1;

    const year = new Date().getFullYear().toString().slice(-2);
    return `BUS-${year}-${padNumber(next)}`;
  } catch (error) {
    console.error('Error generating bus UID:', error);
    throw error;
  }
};

// Add Bus Controller
const addBus = async (req, res) => {
  try {
    const {
      busName,
      model,
      numberOfSeats,
      licensePlate,
      assignedDevice,
      organization,
      driver,
      status = 'unassigned'
    } = req.body;

    // Basic validation
    if (!busName || !model || !numberOfSeats || !licensePlate || !organization) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    const busUID = await generateBusUID();

    const newBus = {
      busUID,
      busName,
      model,
      numberOfSeats,
      licensePlate,
      assignedDevice: assignedDevice || '',
      organization,
      driver: driver || 'Not yet assigned',
      status,
      createdAt: new Date().toISOString(),
    };

    await db.ref(`r1d3-py_bus/${busUID}`).set(newBus);

    return res.status(201).json({ message: 'Bus added successfully', bus: newBus });
  } catch (error) {
    console.error('Error adding bus:', error);
    return res.status(500).json({ error: 'Failed to add bus' });
  }
};

module.exports = {
  addBus
};
