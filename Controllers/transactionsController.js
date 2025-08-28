// controllers/transactionsController.js
const { db } = require('../config/firebase');

const TRANSACTIONS_PATH = 'r1d3p_tr4z_transac';

// Reusable transaction creation logic
const createTransactionRecord = async ({
  type,
  amount,
  fromUser,
  organization,
  ...otherFields
}) => {
  if (!type || typeof amount !== 'number' || !fromUser) {
    throw new Error('Missing required fields: type, amount, and fromUser');
  }

  const transactionUID = `RP-${Date.now()}`;
  const date = new Date();
  const isoDate = date.toISOString();
  const timestamp = date.getTime();

  const baseTransaction = {
    type,
    date: isoDate,
    timestamp,
    amount,
    fromUser,
    organization
  };

  let fullTransaction = { ...baseTransaction };

  switch (type) {
    case 'bus':
      const {
        busId,
        deviceId,
        driverId,
        busPaymentType,
        busPaymentAmount,
      } = otherFields;

      if (!busId || !deviceId || !driverId || !busPaymentType || typeof busPaymentAmount !== 'number') {
        throw new Error('Missing bus transaction fields.');
      }

      const optionalKeys = [
        'succeedingDistance',
        'succeedingFare',
        'tapIn',
        'tapOut',
        'distance',
        'operatorUnit',
      ];

      const optionalData = {};
      optionalKeys.forEach(k => {
        if (otherFields[k] !== undefined) optionalData[k] = otherFields[k];
      });

      fullTransaction = {
        ...fullTransaction,
        busId,
        deviceId,
        driverId,
        busPaymentType,
        busPaymentAmount,
      };
      break;

    case 'topup':
      const { topupMethod, topUpAmount, topUpFee } = otherFields;

      if (!topupMethod || typeof topUpAmount !== 'number' || typeof topUpFee !== 'number') {
        throw new Error('Missing top-up transaction fields.');
      }

      fullTransaction = {
        ...fullTransaction,
        topupMethod,
        topUpAmount,
        topUpFee,
      };
      break;

    case 'card':
      const {
        issuedCard,
        cardPrice,
        cardIssuanceFee,
        cardIssuanceLocation,
      } = otherFields;

      if (
        !issuedCard ||
        typeof cardPrice !== 'number' ||
        typeof cardIssuanceFee !== 'number' ||
        !cardIssuanceLocation
      ) {
        throw new Error('Missing card transaction fields.');
      }

      fullTransaction = {
        ...fullTransaction,
        issuedCard,
        cardPrice,
        cardIssuanceFee,
        cardIssuanceLocation,
      };
      break;

    default:
      throw new Error(`Invalid transaction type: ${type}`);
  }

  await db.ref(`${TRANSACTIONS_PATH}/${transactionUID}`).set(fullTransaction);

  return {
    transactionUID,
    transaction: fullTransaction,
  };
};

// Create a new transaction (modular for any type)
const createTransaction = async (req, res) => {
  try {
    const {
      type, // 'bus', 'topup', 'card'
      amount,
      fromUser,
      organization,
      ...otherFields
    } = req.body;

    // Basic validation
    if (!type || typeof amount !== 'number' || !fromUser) {
      return res.status(400).json({
        message: 'Missing required fields. type, amount, and fromUser are required.',
      });
    }

    const transactionUID = `RP-${Date.now()}`;
    const date = new Date();
    const isoDate = date.toISOString();
    const timestamp = date.getTime();

    const baseTransaction = {
      type,
      date: isoDate,
      timestamp,
      amount,
      fromUser,
      organization,
    };

    let fullTransaction = { ...baseTransaction };

    // Extend based on transaction type
    switch (type) {
      case 'bus':
        const {
          busId,
          deviceId,
          driverId,
          busPaymentType,
          busPaymentAmount,
        } = otherFields;

        if (!busId || !deviceId || !driverId || !busPaymentType || typeof busPaymentAmount !== 'number') {
          return res.status(400).json({
            message: 'Missing bus transaction fields.',
          });
        }

        fullTransaction = {
          ...fullTransaction,
          busId,
          deviceId,
          driverId,
          busPaymentType,
          busPaymentAmount,
        };
        break;

      case 'topup':
        const { topupMethod, topUpAmount, topUpFee } = otherFields;

        if (!topupMethod || typeof topUpAmount !== 'number' || typeof topUpFee !== 'number') {
          return res.status(400).json({
            message: 'Missing top-up transaction fields.',
          });
        }

        fullTransaction = {
          ...fullTransaction,
          topupMethod,
          topUpAmount,
          topUpFee,
        };
        break;

      case 'card':
        const {
          issuedCard,
          cardPrice,
          cardIssuanceFee,
          cardIssuanceLocation,
        } = otherFields;

        if (
          !issuedCard ||
          typeof cardPrice !== 'number' ||
          typeof cardIssuanceFee !== 'number' ||
          !cardIssuanceLocation
        ) {
          return res.status(400).json({
            message: 'Missing card transaction fields.',
          });
        }

        fullTransaction = {
          ...fullTransaction,
          issuedCard,
          cardPrice,
          cardIssuanceFee,
          cardIssuanceLocation,
        };
        break;

      default:
        return res.status(400).json({ message: `Invalid transaction type: ${type}` });
    }

    // Save transaction to DB
    await db.ref(`${TRANSACTIONS_PATH}/${transactionUID}`).set(fullTransaction);

    return res.status(201).json({
      message: 'Transaction recorded successfully',
      transactionUID,
      transaction: fullTransaction,
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return res.status(500).json({
      message: 'Failed to create transaction',
      error: error.message,
    });
  }
};

const getTransactions = async (req, res) => {
  try {
    const { type, fromUser, startTimestamp, endTimestamp, driverId, busId } = req.query;

    let ref = db.ref(TRANSACTIONS_PATH);

    // Filter by type or fromUser or timestamp
    if (type) {
      ref = ref.orderByChild('type').equalTo(type);
    } else if (fromUser) {
      ref = ref.orderByChild('fromUser').equalTo(fromUser);
    } else if (startTimestamp || endTimestamp) {
      ref = ref.orderByChild('timestamp');
    }

    const snapshot = await ref.once('value');
    const data = snapshot.val();

    if (!data) {
      return res.status(200).json([]); // empty list if no results
    }

    let transactionsArray = Object.entries(data).map(([uid, details]) => ({
      transactionUID: uid,
      ...details,
    }));

    // Optional filtering
    transactionsArray = transactionsArray.filter((txn) => {
      const ts = txn.timestamp || new Date(txn.date).getTime();

      // timestamp range
      if (startTimestamp && ts < Number(startTimestamp)) return false;
      if (endTimestamp && ts > Number(endTimestamp)) return false;

      // driverId filter (only if provided)
      if (driverId && txn.driverId !== driverId) return false;

      // busId filter (only if provided)
      if (busId && txn.busId !== busId) return false;

      return true;
    });

    return res.status(200).json(transactionsArray);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return res.status(500).json({
      message: 'Failed to fetch transactions',
      error: error.message,
    });
  }
};

module.exports = {
  createTransaction,
  createTransactionRecord,
  getTransactions,
};