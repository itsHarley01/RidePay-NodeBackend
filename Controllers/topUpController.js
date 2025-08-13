const { db } = require('../config/firebase');
const { createTransactionRecord } = require('./transactionsController');

const USERS_PATH = 'p4zs3gr_usr_uu34';

const topUpUserBalance = async (req, res) => {
  try {
    const { userId, topUpAmount, topUpFee, topupMethod, organization } = req.body;

    // Validate inputs
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ message: 'userId is required and must be a string.' });
    }
    if (typeof topUpAmount !== 'number') {
      return res.status(400).json({ message: 'topUpAmount is required and must be a number.' });
    }
    if (typeof topUpFee !== 'number') {
      return res.status(400).json({ message: 'topUpFee is required and must be a number.' });
    }
    if (!topupMethod || typeof topupMethod !== 'string') {
      return res.status(400).json({ message: 'topupMethod is required and must be a string.' });
    }

    const totalAmount = topUpAmount + topUpFee;

    // Get current balance from new path
    const balanceRef = db.ref(`${USERS_PATH}/${userId}/balance`);
    const snapshot = await balanceRef.get();
    const currentBalance = snapshot.exists() ? snapshot.val() : 0;

    const newBalance = currentBalance + topUpAmount;
    await balanceRef.set(newBalance);

    // Create transaction in DB
    await createTransactionRecord({
      type: 'topup',
      amount: totalAmount, // full amount including fee
      fromUser: userId,
      topupMethod,
      topUpAmount,
      topUpFee,
      organization,
    });

    return res.status(200).json({
      message: 'Top-up successful',
      newBalance,
    });
  } catch (error) {
    console.error('Error in top-up:', error);
    return res.status(500).json({ message: 'Top-up failed', error: error.message });
  }
};

module.exports = {
  topUpUserBalance,
};
