const db = require('../config/firebase');

// GET: Fetch a bus by UID
const getBusById = async (req, res) => {
  const { id } = req.params;

  try {
    const snapshot = await db.ref(`r1d3-py_bus/${id}`).once('value');

    if (!snapshot.exists()) {
      return res.status(404).json({ message: 'Bus not found' });
    }

    const busData = snapshot.val();
    return res.status(200).json(busData);
  } catch (error) {
    console.error('Error fetching bus data:', error);
    return res.status(500).json({ message: 'Failed to fetch bus data' });
  }
};

// PUT: Update a bus (only changed fields)
const updateBusById = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const ref = db.ref(`r1d3-py_bus/${id}`);
    const snapshot = await ref.once('value');

    if (!snapshot.exists()) {
      return res.status(404).json({ message: 'Bus not found' });
    }

    const currentData = snapshot.val();
    const changedFields = {};

    // Only collect fields that are different
    Object.keys(updates).forEach((key) => {
      if (updates[key] !== currentData[key]) {
        changedFields[key] = updates[key];
      }
    });

    if (Object.keys(changedFields).length === 0) {
      return res.status(200).json({ message: 'No changes detected' });
    }

    // Update only the changed fields
    await ref.update(changedFields);
    return res.status(200).json({ message: 'Bus updated successfully', updatedFields: changedFields });
  } catch (error) {
    console.error('Error updating bus data:', error);
    return res.status(500).json({ message: 'Failed to update bus data' });
  }
};

module.exports = {
  getBusById,
  updateBusById,
};
