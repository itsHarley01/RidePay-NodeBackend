const { db } = require('../config/firebase');

const SHARES_PATH = 'r1d3-py_shares';

/**
 * Update DOTR & Transport Coop Shares
 */
const updateMainShares = async (req, res) => {
  try {
    const { dotrShare, coopShare } = req.body;

    if (typeof dotrShare !== 'string' || typeof coopShare !== 'string') {
      return res.status(400).json({ message: 'dotrShare and coopShare must be strings' });
    }

    await db.ref(SHARES_PATH).update({
      dotrShare,
      coopShare,
    });

    return res.status(200).json({ message: 'DOTR and Coop shares updated successfully' });
  } catch (error) {
    console.error('Error updating main shares:', error);
    return res.status(500).json({ message: 'Failed to update main shares' });
  }
};

/**
 * Update Transport Operator & Driver Shares
 */
const updateOperatorShares = async (req, res) => {
  try {
    const { operatorShare, driverShare } = req.body;

    if (typeof operatorShare !== 'string' || typeof driverShare !== 'string') {
      return res.status(400).json({ message: 'operatorShare and driverShare must be strings' });
    }

    await db.ref(SHARES_PATH).update({
      operatorShare,
      driverShare,
    });

    return res.status(200).json({ message: 'Operator and Driver shares updated successfully' });
  } catch (error) {
    console.error('Error updating operator shares:', error);
    return res.status(500).json({ message: 'Failed to update operator shares' });
  }
};

/**
 * Get all Shares
 */
const getShares = async (req, res) => {
  try {
    const snapshot = await db.ref(SHARES_PATH).once('value');
    const shares = snapshot.val();

    if (!shares) {
      return res.status(404).json({ message: 'Shares not set yet' });
    }

    return res.status(200).json(shares);
  } catch (error) {
    console.error('Error fetching shares:', error);
    return res.status(500).json({ message: 'Failed to fetch shares' });
  }
};

module.exports = {
  getShares,
  updateMainShares,
  updateOperatorShares,
};
