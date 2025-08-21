const { db } = require('../config/firebase');
const { createTransactionRecord } = require('./transactionsController');

const CARD_PATH = 'k44d_r1g3s_74l';
const USER_PATH = 'p4zs3gr_usr_uu34';
const TARIFF_PATH = 'r1d3-py_tariff/fixed/minimumFee';
const BUS_PATH = 'r1d3-py_bus';
const DRIVER_PATH = 'r3g1s_user_us3r_4cc5';
const DISTANCE_TARIFF_PATH = 'r1d3-py_tariff/distanceBased';

// Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) *
            Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // in km
}

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
      organization: 'Coop 1', 
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

const driverBusTap = async (req, res) => {
  try {
    const { tagUid, cardId, busId } = req.body;

    if (!tagUid || !cardId || !busId) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    // Validate cardId and tagUid
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

    // Get bus driver info
    const busSnap = await db.ref(`${BUS_PATH}/${busId}/driver`).get();
    if (!busSnap.exists()) {
      return res.status(404).json({ success: false, message: 'Bus not found.' });
    }

    const currentDriver = busSnap.val();
    const now = new Date().toISOString(); // Current datetime

    const logRef = db.ref(`${DRIVER_PATH}/${userUid}/log`);

    if (currentDriver === 'Not yet assigned') {
      // LOGIN flow
      await db.ref(`${BUS_PATH}/${busId}/driver`).set(userUid);

      // Create a new log entry
      const newLogRef = logRef.push();
      await newLogRef.set({ busId, login: now });

      return res.status(200).json({
        success: true,
        message: 'Driver signed in successfully.',
        action: 'login',
        driverId: userUid,
        busId
      });

    } else if (currentDriver === userUid) {
      // LOGOUT flow
      await db.ref(`${BUS_PATH}/${busId}/driver`).set('Not yet assigned');

      // Find the last log entry with no logout
      const logSnap = await logRef.orderByKey().limitToLast(1).get();
      let lastLogKey = null;

      logSnap.forEach((child) => {
        lastLogKey = child.key;
      });

      if (lastLogKey) {
        await logRef.child(lastLogKey).update({ logout: now });
      } else {
        // If no log exists, create one with logout (edge case)
        await logRef.push({ logout: now });
      }

      return res.status(200).json({
        success: true,
        message: 'Driver signed out successfully.',
        action: 'logout',
        driverId: userUid,
        busId
      });

    } else {
      // Another driver is assigned to this bus
      return res.status(403).json({
        success: false,
        message: 'Another driver is currently assigned to this bus.'
      });
    }

  } catch (error) {
    console.error('Driver bus tap error:', error);
    return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
};

const distanceBasedBusTap = async (req, res) => {
  try {
    const { tagUid, cardId, busId, deviceId, lat, long } = req.body;

    if (!tagUid || !cardId || !busId || !deviceId || lat == null || long == null) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    // Step 1: Validate card
    const cardSnap = await db.ref(`${CARD_PATH}/${cardId}`).get();
    if (!cardSnap.exists()) return res.status(404).json({ success: false, message: 'Card ID not found.' });
    const cardData = cardSnap.val();
    if (cardData.tagUid !== tagUid) return res.status(403).json({ success: false, message: 'Tag UID mismatch.' });
    const userUid = cardData.userUid;
    if (!userUid) return res.status(404).json({ success: false, message: 'User UID not linked to card.' });

    // Step 2: Check if already tapped (tap-in exists)
    const tappedSnap = await db.ref(`${USER_PATH}/${userUid}/tapped`).get();

    if (!tappedSnap.exists()) {
      // TAP-IN
      await db.ref(`${USER_PATH}/${userUid}/tapped`).set({
        timestamp: new Date().toISOString(),
        lat,
        long,
        busId,
        deviceId
      });
      return res.status(200).json({ success: true, message: 'Tap-in recorded successfully.' });

    } else {
      // TAP-OUT
      const tapInData = tappedSnap.val();
      const distance = calculateDistance(tapInData.lat, tapInData.long, lat, long);

      // Get tariff
      const tariffSnap = await db.ref(DISTANCE_TARIFF_PATH).get();
      const { minimumFare, succeedingDistance, succeedingFare } = tariffSnap.val();

      // Compute fare
      let fare = Number(minimumFare);
      if (distance > succeedingDistance) {
        const extraKm = Math.ceil((distance - succeedingDistance) / succeedingDistance);
        fare += extraKm * Number(succeedingFare);
      }

      // Check balance
      const balanceSnap = await db.ref(`${USER_PATH}/${userUid}/balance`).get();
      const balance = balanceSnap.val();
      if (balance < fare) return res.status(402).json({ success: false, message: 'Insufficient balance.' });

      // Get driver
      const busSnap = await db.ref(`${BUS_PATH}/${busId}/driver`).get();
      const driverId = busSnap.val();

      // Deduct balance
      await db.ref(`${USER_PATH}/${userUid}/balance`).set(balance - fare);

      // Record transaction
      await createTransactionRecord({
        type: 'bus',
        amount: fare,
        fromUser: userUid,
        busId,
        deviceId,
        driverId,
        busPaymentType: 'distanceBased',
        organization: 'Coop1',
        operatorUnit: 'Operator 1',
        busPaymentAmount: minimumFare,
        succeedingDistance,
        tapIn: tapInData,
        tapOut: { lat, long, timestamp: new Date().toISOString() }
      });

      // Remove tap-in data
      await db.ref(`${USER_PATH}/${userUid}/tapped`).remove();

      return res.status(200).json({
        success: true,
        message: 'Fare deducted and transaction recorded.',
        distance: distance.toFixed(2),
        fare,
        newBalance: balance - fare
      });
    }

  } catch (error) {
    console.error('Distance-based bus tap error:', error);
    return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
};

module.exports = { tapBus, driverBusTap, distanceBasedBusTap };
