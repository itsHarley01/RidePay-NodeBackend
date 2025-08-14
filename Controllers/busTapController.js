const { db } = require('../config/firebase');
const { createTransactionRecord } = require('./transactionsController');

const CARD_PATH = 'k44d_r1g3s_74l';
const USER_PATH = 'p4zs3gr_usr_uu34';
const TARIFF_PATH = 'r1d3-py_tariff/fixed/minimumFee';
const BUS_PATH = 'r1d3-py_bus';

const tapBus = async (req, res) => {
  try {
    const { tagUid, cardId, busId, deviceId } = req.body;

    if (!tagUid || !cardId || !busId || !deviceId) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    // Step 1: Validate cardId and tagUid
    const cardSnap = await db.ref(`${CARD_PATH}/${cardId}`).get();
    if (!cardSnap.exists()) {
      return res.status(404).json({ success: false, message: 'Card ID not found.' });
    }

    const cardData = cardSnap.val();
    if (cardData.tagUid !== tagUid) {
      return res.status(403).json({ success: false, message: 'Tag UID mismatch.' });
    }

    const userUid = cardData.userUid;
    if (!userUid) {
      return res.status(404).json({ success: false, message: 'User UID not linked to card.' });
    }

    // Step 2: Get user balance
    const userSnap = await db.ref(`${USER_PATH}/${userUid}/balance`).get();
    const currentBalance = userSnap.val();

    if (typeof currentBalance !== 'number') {
      return res.status(500).json({ success: false, message: 'Invalid or missing user balance.' });
    }

    // Step 3: Get fare
    const tariffSnap = await db.ref(TARIFF_PATH).get();
    const minimumFeeRaw = tariffSnap.val();
    const minimumFee = Number(minimumFeeRaw);

    if (isNaN(minimumFee) || minimumFee <= 0) {
      return res.status(500).json({ success: false, message: 'Tariff not set or invalid.' });
    }

    // Step 3.5: Get driverId from bus
    const busSnap = await db.ref(`${BUS_PATH}/${busId}/driver`).get();
    const driverId = busSnap.val();

    if (!driverId) {
      return res.status(500).json({ success: false, message: 'Driver ID not found for this bus.' });
    }

    // Step 4: Check balance
    if (currentBalance < minimumFee) {
      return res.status(402).json({ success: false, message: 'Insufficient balance.' });
    }

    const newBalance = currentBalance - minimumFee;

    // Step 5: Update user balance
    await db.ref(`${USER_PATH}/${userUid}/balance`).set(newBalance);

    // Step 6: Record transaction
    await createTransactionRecord({
      type: 'bus',
      amount: minimumFee,
      fromUser: userUid,
      busId,
      deviceId,
      driverId,
      busPaymentType: 'fixed',
      organization: 'Coop 1', // Adjust as necessary
      busPaymentAmount: minimumFee,
    });

    return res.status(200).json({
      success: true,
      message: 'Fare deducted and transaction recorded.',
      newBalance,
    });

  } catch (error) {
    console.error('Bus tap error:', error);
    return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
};

module.exports = { tapBus };
