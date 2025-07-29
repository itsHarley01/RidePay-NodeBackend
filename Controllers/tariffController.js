const db = require('../config/firebase');

const TARIFF_PATH = 'r1d3-py_d4tts/tariff';

/**
 * Update tariff for either distanceBased or fixed tariff type
 */
const updateTariff = async (req, res) => {
  try {
    const { type, minimumDistance, minimumFee } = req.body;

    if (!type || !['distanceBased', 'fixed'].includes(type)) {
      return res.status(400).json({ message: 'Invalid or missing type. Must be "distanceBased" or "fixed"' });
    }

    const updateData = {};

    if (type === 'distanceBased') {
      if (typeof minimumDistance !== 'string' || typeof minimumFee !== 'string') {
        return res.status(400).json({ message: 'minimumDistance and minimumFee must be strings for distanceBased' });
      }
      updateData['distanceBased'] = { minimumDistance, minimumFee };
    }

    if (type === 'fixed') {
      if (typeof minimumFee !== 'string') {
        return res.status(400).json({ message: 'minimumFee must be a string for fixed' });
      }
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

module.exports = {
  updateTariff,
  getTariff
};
