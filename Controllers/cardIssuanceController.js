const { db } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');
const { createTransactionRecord } = require('./transactionsController');

function generateRandomCardId(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function issueCard(req, res) {
  try {
    const {
      tagUid,
      cardType,
      userUid,
      cardPrice,
      cardIssuanceFee,
      cardIssuanceLocation,
      organization,
      amount,
    } = req.body;

    // Validate required fields
    if (!tagUid || !userUid || typeof cardPrice !== 'number' ||
        typeof cardIssuanceFee !== 'number' || !cardIssuanceLocation || typeof amount !== 'number') {
      return res.status(400).json({ message: 'Missing required fields for card issuance transaction.' });
    }

    // Check if tagUid already issued
    const snapshot = await db.ref('k44d_r1g3s_74l')
      .orderByChild('tagUid')
      .equalTo(tagUid)
      .once('value');

    if (snapshot.exists()) {
      return res.status(409).json({ message: 'This tagUid is already issued to another user.' });
    }

    const cardId = generateRandomCardId();
    const issuanceDate = new Date().toISOString();

    // Save card issuance
    await db.ref(`k44d_r1g3s_74l/${cardId}`).set({
      tagUid,
      userUid,
      cardType,
      dateOfIssuance: issuanceDate,
      cardStatus: 'active'
    });

    // Update user record
    await db.ref(`p4zs3gr_usr_uu34/${userUid}`).update({
      cardId
    });

    // 🔹 Record the card issuance transaction
    await createTransactionRecord({
      type: 'card',
      amount,           // total amount (cardPrice + fee)
      fromUser: userUid,
      issuedCard: cardId,
      cardPrice,
      cardIssuanceFee,
      organization,
      cardIssuanceLocation
    });

    return res.status(200).json({
      message: 'Card issued and transaction recorded successfully',
      cardId,
      tagUid,
      userUid
    });

  } catch (error) {
    console.error('issueCard error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// SCAN CARD
async function scanCard(req, res) {
  try {
    const { tagUid, metaData } = req.query; // Use req.query for GET

    if (!tagUid || !metaData) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const ownershipId = metaData;

    // Search all cards to find matching ownershipId
    const cardsSnapshot = await db.ref('k44d_r1g3s_74l').once('value');
    const cardsData = cardsSnapshot.val();

    let matchedCard = null;

    for (const key in cardsData) {
      const entry = cardsData[key];
      if (entry.metaData?.ownershipId === ownershipId) {
        matchedCard = entry;
        break;
      }
    }

    if (!matchedCard) {
      return res.status(404).json({ valid: false, reason: 'Card not registered' });
    }

    const { userUid, tagUid: storedTagUid } = matchedCard.metaData;

    const userCardRef = db.ref(`p4zs3gr_usr_uu34/${userUid}/cards/${ownershipId}`);
    const snapshot = await userCardRef.once('value');

    if (!snapshot.exists()) {
      return res.status(404).json({ valid: false, reason: 'Card ownership not found' });
    }

    const cardData = snapshot.val();
    const isValid = cardData.tagId === tagUid && storedTagUid === tagUid;

    if (!isValid) {
      return res.status(200).json({
        valid: false,
        tagUid,
        ownershipId,
        reason: 'Tag mismatch',
      });
    }

    return res.status(200).json({
      valid: true,
      tagUid,
      ownershipId,
      metaData: matchedCard.metaData,
      reason: 'Card verified',
    });

  } catch (error) {
    console.error('scanCard error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function issueDriverCard(req, res) {
  try {
    const { tagUid, userUid } = req.body;

    // Validate required fields
    if (!tagUid || !userUid) {
      return res.status(400).json({ message: 'Missing required fields for driver card issuance.' });
    }

    // Check if tagUid is already issued
    const snapshot = await db.ref('k44d_r1g3s_74l')
      .orderByChild('tagUid')
      .equalTo(tagUid)
      .once('value');

    if (snapshot.exists()) {
      return res.status(409).json({ message: 'This tagUid is already issued to another user.' });
    }

    const cardId = generateRandomCardId(); // Reuse your existing function
    const issuanceDate = new Date().toISOString();
    const cardType = 'driver'; // set driver card type

    // Save card issuance
    await db.ref(`k44d_r1g3s_74l/${cardId}`).set({
      tagUid,
      userUid,
      cardType,
      dateOfIssuance: issuanceDate,
      cardStatus: 'active'
    });

    // Update user record
    await db.ref(`r3g1s_user_us3r_4cc5/${userUid}`).update({
      cardId
    });

    return res.status(200).json({
      message: 'Driver card issued successfully',
      cardId,
      tagUid,
      userUid
    });

  } catch (error) {
    console.error('issueDriverCard error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = { issueCard, scanCard, issueDriverCard };
