const { db } = require('../config/firebase');

const TARIFF_PATH = 'r1d3-py_tariff';

/**
 * Update tariff for either distanceBased or fixed tariff type
 */
const updateTariff = async (req, res) => {
  try {
    const { type } = req.body;

    if (!type || !['distanceBased', 'fixed'].includes(type)) {
      return res.status(400).json({
        message: 'Invalid or missing type. Must be "distanceBased" or "fixed"'
      });
    }

    const updateData = {};

    if (type === 'distanceBased') {
      let { minimumFare, succeedingDistance, succeedingFare } = req.body;

      // Ensure values are numbers (can be zero)
      if (
        minimumFare === undefined ||
        succeedingDistance === undefined ||
        succeedingFare === undefined
      ) {
        return res.status(400).json({
          message: 'minimumFare, succeedingDistance, and succeedingFare are required for distanceBased'
        });
      }

      // Convert to numbers
      minimumFare = parseFloat(minimumFare);
      succeedingDistance = parseFloat(succeedingDistance);
      succeedingFare = parseFloat(succeedingFare);

      if (
        isNaN(minimumFare) ||
        isNaN(succeedingDistance) ||
        isNaN(succeedingFare)
      ) {
        return res.status(400).json({
          message: 'minimumFare, succeedingDistance, and succeedingFare must be valid numbers'
        });
      }

      // Format: fares → 2 decimals, distances → 1 decimal
      minimumFare = parseFloat(minimumFare.toFixed(2));
      succeedingDistance = parseFloat(succeedingDistance.toFixed(1));
      succeedingFare = parseFloat(succeedingFare.toFixed(2));

      updateData['distanceBased'] = {
        minimumFare,
        succeedingDistance,
        succeedingFare
      };
    }

    if (type === 'fixed') {
      let { minimumFee } = req.body;

      if (minimumFee === undefined) {
        return res.status(400).json({
          message: 'minimumFee is required for fixed'
        });
      }

      minimumFee = parseFloat(minimumFee);

      if (isNaN(minimumFee)) {
        return res.status(400).json({
          message: 'minimumFee must be a valid number'
        });
      }

      // Format fare → 2 decimals
      minimumFee = parseFloat(minimumFee.toFixed(2));

      updateData['fixed'] = { minimumFee };
    }

    await db.ref(TARIFF_PATH).update(updateData);

    return res.status(200).json({ message: `${type} tariff updated successfully` });

  } catch (error) {
    console.error('Error updating tariff:', error);
    return res.status(500).json({ message: 'Failed to update tariff' });
  }
};

/**
 * Get the full tariff data (distanceBased + fixed)
 */
const getTariff = async (req, res) => {
  try {
    const snapshot = await db.ref(TARIFF_PATH).once('value');
    const tariff = snapshot.val();

    if (!tariff) {
      return res.status(404).json({ message: 'Tariff not set yet' });
    }

    return res.status(200).json(tariff);
  } catch (error) {
    console.error('Error fetching tariff:', error);
    return res.status(500).json({ message: 'Failed to fetch tariff' });
  }
};

const setFixedEnabled = async (req, res) => {
  try {
    let { fixedEnabled } = req.body;

    if (fixedEnabled === undefined) {
      return res.status(400).json({
        message: 'fixedEnabled boolean is required'
      });
    }

    // Ensure it's a boolean
    if (typeof fixedEnabled !== 'boolean') {
      return res.status(400).json({
        message: 'fixedEnabled must be a boolean value'
      });
    }

    // Check if the path exists; if not, create it
    const snapshot = await db.ref(TARIFF_PATH).once('value');
    if (!snapshot.exists()) {
      await db.ref(TARIFF_PATH).set({ fixed: {}, distanceBased: {}, fixedEnabled: false });
    }

    // Update or create the boolean
    await db.ref(`${TARIFF_PATH}/fixedEnabled`).set(fixedEnabled);

    // Return the current value in response
    return res.status(200).json({
      message: `fixedEnabled set successfully`,
      fixedEnabled
    });

  } catch (error) {
    console.error('Error updating fixedEnabled:', error);
    return res.status(500).json({ message: 'Failed to update fixedEnabled' });
  }
};

    const getFixedEnabled = async (req, res) => {
  try {
    const snapshot = await db.ref(`${TARIFF_PATH}/fixedEnabled`).once('value')
    const fixedEnabled = snapshot.exists() ? snapshot.val() : false

    return res.status(200).json({ fixedEnabled })
  } catch (error) {
    console.error('Error fetching fixedEnabled:', error)
    return res.status(500).json({ message: 'Failed to fetch fixedEnabled' })
  }
}

module.exports = {
  updateTariff,
  getTariff,
  setFixedEnabled,
  getFixedEnabled,
}