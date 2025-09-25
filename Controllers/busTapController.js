const { db } = require('../config/firebase');
const { createTransactionRecord } = require('./transactionsController');

const CARD_PATH = 'k44d_r1g3s_74l';
const USER_PATH = 'p4zs3gr_usr_uu34';
const TARIFF_PATH = 'r1d3-py_tariff/fixed/minimumFee';
const BUS_PATH = 'r1d3-py_bus';
const DRIVER_PATH = 'r3g1s_user_us3r_4cc5';
const DISTANCE_TARIFF_PATH = 'r1d3-py_tariff/distanceBased';
const DISCOUNT_PATH = 'r1d3-py_discount';
const PROMOS_PATH = 'promos-dat';

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
    const userSnap = await db.ref(`${USER_PATH}/${userUid}`).get();
    const userData = userSnap.val();
    const currentBalance = userData?.balance;

    if (typeof currentBalance !== 'number') {
      return res.status(500).json({ success: false, message: 'Invalid or missing user balance.' });
    }

    // Step 3: Get base fare
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

    // --- APPLY DISCOUNT ---
    let finalFare = minimumFee;
    let appliedDiscount = null;

    if (userData?.discount === true && userData.discountType) {
      const discountSnap = await db.ref(`${DISCOUNT_PATH}/${userData.discountType}`).get();
      if (discountSnap.exists()) {
        const discountRate = discountSnap.val().rate; // percentage
        if (typeof discountRate === 'number' && discountRate > 0) {
          const discountAmount = (minimumFee * discountRate) / 100;
          finalFare -= discountAmount;
          appliedDiscount = {
            type: userData.discountType,
            rate: discountRate,
            amount: discountAmount,
          };
        }
      }
    }

// --- APPLY PROMOS ---
const promosSnap = await db.ref(PROMOS_PATH).get();
const promos = promosSnap.exists() ? promosSnap.val() : {};
let appliedPromos = {};

for (const [promoId, promo] of Object.entries(promos)) {
  if (promo.effectType !== 'bus') continue;

  let eligible = false;
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD
  const todayWeekDay = today.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();

  // Check promo eligibility (dateRange or weekdays)
  if (promo.dateRange) {
    eligible = todayStr >= promo.startDate && todayStr <= promo.endDate;
  } else if (promo.weekDays && Array.isArray(promo.weekDays)) {
    eligible = promo.weekDays.map(d => d.toLowerCase()).includes(todayWeekDay);
  }

  if (!eligible) continue;

  const discountValue = Number(promo.discount) || 0;
  if (discountValue <= 0) continue;

  let discountAmount = 0;

  if (promo.percentage === true) {
    // Percentage promo
    discountAmount = (finalFare * discountValue) / 100;
    appliedPromos[promoId] = {
      name: promo.name || 'Bus Promo',
      discount: `${discountValue}%`,
      amount: discountAmount,
    };
  } else {
    // Flat peso promo
    discountAmount = discountValue;
    appliedPromos[promoId] = {
      name: promo.name || 'Bus Promo',
      discount: `${discountValue}`,
      amount: discountAmount,
    };
  }

  finalFare -= discountAmount;
  if (finalFare < 0) finalFare = 0; // prevent negative fare
}


    // Step 4: Check balance
    if (currentBalance < finalFare) {
      return res.status(402).json({ success: false, message: 'Insufficient balance.' });
    }

    const newBalance = currentBalance - finalFare;

    // Step 5: Update user balance
    await db.ref(`${USER_PATH}/${userUid}/balance`).set(newBalance);

    // Step 6: Record transaction with discount + promos
    await createTransactionRecord({
      type: 'bus',
      amount: finalFare,
      fromUser: userUid,
      busId,
      deviceId,
      driverId,
      busPaymentType: 'fixed',
      organization: 'Coop 1',
      busPaymentAmount: minimumFeeRaw,
      discount: appliedDiscount,
      promos: appliedPromos,
    });

    return res.status(200).json({
      success: true,
      message: 'Fare deducted and transaction recorded.',
      newBalance,
      finalFare,
      appliedDiscount,
      appliedPromos,
    });

  } catch (error) {
    console.error('Bus tap error:', error);
    return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
};

// Controller: qrTapBus.ts
const qrTapBus = async (req, res) => {
  try {
    const { userId, busId, deviceId } = req.body;

    if (!userId || !busId || !deviceId) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    // 🔹 Step 0: Check discount expiration before continuing
    try {
      const expirationResult = await applicationExpiration(userId);
      console.log("Discount check:", expirationResult);
      // we don’t block the transaction if expired, we just update
    } catch (err) {
      console.error("applicationExpiration error:", err);
      // optional: you can return error here if you want to block, 
      // but usually better to just log and continue
    }

    // Step 1: Get user balance
    const userSnap = await db.ref(`${USER_PATH}/${userId}`).get();
    if (!userSnap.exists()) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const userData = userSnap.val();
    const currentBalance = userData?.balance;

    if (typeof currentBalance !== 'number') {
      return res.status(500).json({ success: false, message: 'Invalid or missing user balance.' });
    }

    // Step 2: Get base fare
    const tariffSnap = await db.ref(TARIFF_PATH).get();
    const minimumFeeRaw = tariffSnap.val();
    const minimumFee = Number(minimumFeeRaw);

    if (isNaN(minimumFee) || minimumFee <= 0) {
      return res.status(500).json({ success: false, message: 'Tariff not set or invalid.' });
    }

    // Step 3: Get driverId from bus
    const busSnap = await db.ref(`${BUS_PATH}/${busId}/driver`).get();
    const driverId = busSnap.val();
    if (!driverId) {
      return res.status(500).json({ success: false, message: 'Driver ID not found for this bus.' });
    }

    // --- APPLY DISCOUNT ---
    let finalFare = minimumFee;
    let appliedDiscount = null;

    if (userData?.discount === true && userData.discountType) {
      const discountSnap = await db.ref(`${DISCOUNT_PATH}/${userData.discountType}`).get();
      if (discountSnap.exists()) {
        const discountRate = discountSnap.val().rate; // percentage
        if (typeof discountRate === 'number' && discountRate > 0) {
          const discountAmount = (minimumFee * discountRate) / 100;
          finalFare -= discountAmount;
          appliedDiscount = {
            type: userData.discountType,
            rate: discountRate,
            amount: discountAmount,
          };
        }
      }
    }

    // --- APPLY PROMOS ---
    const promosSnap = await db.ref(PROMOS_PATH).get();
    const promos = promosSnap.exists() ? promosSnap.val() : {};
    let appliedPromos = {};

    for (const [promoId, promo] of Object.entries(promos)) {
      if (promo.effectType !== 'bus') continue;

      let eligible = false;
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD
      const todayWeekDay = today.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();

      if (promo.dateRange) {
        eligible = todayStr >= promo.startDate && todayStr <= promo.endDate;
      } else if (promo.weekDays && Array.isArray(promo.weekDays)) {
        eligible = promo.weekDays.map(d => d.toLowerCase()).includes(todayWeekDay);
      }

      if (!eligible) continue;

      const discountValue = Number(promo.discount) || 0;
      if (discountValue <= 0) continue;

      let discountAmount = 0;

      if (promo.percentage === true) {
        discountAmount = (finalFare * discountValue) / 100;
        appliedPromos[promoId] = {
          name: promo.name || 'Bus Promo',
          discount: `${discountValue}%`,
          amount: discountAmount,
        };
      } else {
        discountAmount = discountValue;
        appliedPromos[promoId] = {
          name: promo.name || 'Bus Promo',
          discount: `${discountValue}`,
          amount: discountAmount,
        };
      }

      finalFare -= discountAmount;
      if (finalFare < 0) finalFare = 0;
    }

    // Step 4: Check balance
    if (currentBalance < finalFare) {
      return res.status(402).json({ success: false, message: 'Insufficient balance.' });
    }

    const newBalance = currentBalance - finalFare;

    // Step 5: Update user balance
    await db.ref(`${USER_PATH}/${userId}/balance`).set(newBalance);

    // Step 6: Record transaction
    await createTransactionRecord({
      type: 'bus',
      amount: finalFare,
      fromUser: userId,
      busId,
      deviceId,
      driverId,
      busPaymentType: 'fixed',
      organization: 'Coop 1',
      busPaymentAmount: minimumFeeRaw,
      discount: appliedDiscount,
      promos: appliedPromos,
    });

    return res.status(200).json({
      success: true,
      message: 'Fare deducted and transaction recorded via QR.',
      newBalance,
      finalFare,
      appliedDiscount,
      appliedPromos,
    });

  } catch (error) {
    console.error('QR bus tap error:', error);
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
      // --- TAP-IN ---
      await db.ref(`${USER_PATH}/${userUid}/tapped`).set({
        timestamp: new Date().toISOString(),
        lat,
        long,
        busId,
        deviceId
      });
      return res.status(200).json({ success: true, message: 'Tap-in recorded successfully.' });

    } else {
      // --- TAP-OUT ---
      const tapInData = tappedSnap.val();
      const distance = calculateDistance(tapInData.lat, tapInData.long, lat, long);

      // Step 3: Get tariff
      const tariffSnap = await db.ref(DISTANCE_TARIFF_PATH).get();
      const { minimumFare, succeedingDistance, succeedingFare } = tariffSnap.val();

      // Step 4: Compute base fare
      let baseFare = Number(minimumFare);
      if (distance > succeedingDistance) {
        const extraKm = Math.ceil((distance - succeedingDistance) / succeedingDistance);
        baseFare += extraKm * Number(succeedingFare);
      }

      // Step 5: Get user data + balance
      const userSnap = await db.ref(`${USER_PATH}/${userUid}`).get();
      const userData = userSnap.val();
      const currentBalance = userData?.balance;

      if (typeof currentBalance !== 'number') {
        return res.status(500).json({ success: false, message: 'Invalid or missing user balance.' });
      }

      // Step 6: Get driver
      const busSnap = await db.ref(`${BUS_PATH}/${busId}/driver`).get();
      const driverId = busSnap.val();
      if (!driverId) {
        return res.status(500).json({ success: false, message: 'Driver ID not found for this bus.' });
      }

      // --- APPLY DISCOUNT ---
      let finalFare = baseFare;
      let appliedDiscount = null;

      if (userData?.discount === true && userData.discountType) {
        const discountSnap = await db.ref(`${DISCOUNT_PATH}/${userData.discountType}`).get();
        if (discountSnap.exists()) {
          const discountRate = discountSnap.val().rate; // percentage
          if (typeof discountRate === 'number' && discountRate > 0) {
            const discountAmount = (baseFare * discountRate) / 100;
            finalFare -= discountAmount;
            appliedDiscount = {
              type: userData.discountType,
              rate: discountRate,
              amount: discountAmount,
            };
          }
        }
      }

      // --- APPLY PROMOS ---
      const promosSnap = await db.ref(PROMOS_PATH).get();
      const promos = promosSnap.exists() ? promosSnap.val() : {};
      let appliedPromos = {};

      for (const [promoId, promo] of Object.entries(promos)) {
        if (promo.effectType !== 'bus') continue;

        let eligible = false;
        const today = new Date();
        const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD
        const todayWeekDay = today.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();

        if (promo.dateRange) {
          eligible = todayStr >= promo.startDate && todayStr <= promo.endDate;
        } else if (promo.weekDays && Array.isArray(promo.weekDays)) {
          eligible = promo.weekDays.map(d => d.toLowerCase()).includes(todayWeekDay);
        }

        if (!eligible) continue;

        const discountValue = Number(promo.discount) || 0;
        if (discountValue <= 0) continue;

        let discountAmount = 0;
        if (promo.percentage === true) {
          discountAmount = (finalFare * discountValue) / 100;
          appliedPromos[promoId] = {
            name: promo.name || 'Bus Promo',
            discount: `${discountValue}%`,
            amount: discountAmount,
          };
        } else {
          discountAmount = discountValue;
          appliedPromos[promoId] = {
            name: promo.name || 'Bus Promo',
            discount: `${discountValue}`,
            amount: discountAmount,
          };
        }

        finalFare -= discountAmount;
        if (finalFare < 0) finalFare = 0;
      }

      // Step 7: Check balance
      if (currentBalance < finalFare) {
        return res.status(402).json({ success: false, message: 'Insufficient balance.' });
      }

      const newBalance = currentBalance - finalFare;

      // Step 8: Update balance
      await db.ref(`${USER_PATH}/${userUid}/balance`).set(newBalance);

      // Step 9: Record transaction (with discount + promos)
      await createTransactionRecord({
        type: 'bus',
        amount: finalFare,
        fromUser: userUid,
        busId,
        deviceId,
        driverId,
        busPaymentType: 'distanceBased',
        organization: 'Coop1',
        operatorUnit: 'Operator 1',
        busPaymentAmount: baseFare,
        discount: appliedDiscount,
        promos: appliedPromos,
        succeedingDistance,
        succeedingFare,
        tapIn: tapInData,
        tapOut: { lat, long, timestamp: new Date().toISOString() },
        distance: distance.toFixed(2),
      });

      // Remove tap-in data
      await db.ref(`${USER_PATH}/${userUid}/tapped`).remove();

      return res.status(200).json({
        success: true,
        message: 'Fare deducted and transaction recorded.',
        distance: distance.toFixed(2),
        baseFare,
        finalFare,
        appliedDiscount,
        appliedPromos,
        newBalance,
      });
    }

  } catch (error) {
    console.error('Distance-based bus tap error:', error);
    return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
};


module.exports = { tapBus, driverBusTap, distanceBasedBusTap, qrTapBus};
