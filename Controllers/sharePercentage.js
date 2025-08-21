const { db } = require('../config/firebase');

const SHARES_PATH = 'r1d3-py_shares';

/**
 * Update all shares (DOTR, Coop, Operator, Driver, CardCoop, CardDOTR)
 */
const updateShares = async (req, res) => {
  try {
    const {
      dotrShare,
      coopShare,
      operatorShare,
      driverShare,
      cardCoopShare,
      cardDotrShare,
      cardMaintinanceShare,
    } = req.body;

    const fields = { dotrShare, coopShare, operatorShare, driverShare, cardCoopShare, cardDotrShare, cardMaintinanceShare };

    // remove undefined to avoid Firebase error
    Object.keys(fields).forEach((key) => {
      if (fields[key] === undefined) {
        delete fields[key];
      }
    });

    await db.ref(SHARES_PATH).update(fields);

    return res.status(200).json({ message: 'Shares updated successfully' });
  } catch (error) {
    console.error('Error updating shares:', error);
    return res.status(500).json({ message: 'Failed to update shares' });
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
  updateShares,
};
