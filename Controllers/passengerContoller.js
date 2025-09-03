const { db } = require('../config/firebase');
const admin = require('firebase-admin');
const { generatePassengerUID } = require('../utils/passengerUidGenerator');

// Register Passenger Controller
const registerPassenger = async (req, res) => {
  const { firstName, lastName, middleName, email, password, contactNumber } = req.body;

  // Validate required fields
  if (!firstName || !lastName || !email || !password || !contactNumber) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Create Firebase Auth user
    const userRecord = await admin.auth().createUser({
      email,
      password,
    });

    const uid = userRecord.uid; // Firebase Auth UID
    const systemUid = await generatePassengerUID(); // Custom UID
    const currentDate = new Date().toISOString();

    // Save to Realtime Database
    await db.ref(`p4zs3gr_usr_uu34/${uid}`).set({
      systemUid,
      firstName,
      lastName,
      middleName: middleName || '',
      email,
      discount: false,
      contactNumber,
      balance: 0,
      status: 'active',
      dateOfAccountCreation: currentDate,
    });

    res.status(201).json({
      message: 'Passenger account successfully created',
      uid,
      systemUid,
      contactNumber,
    });

  } catch (err) {
    console.error('❌ Error registering passenger:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get Passenger all or by email/systemUid
const getPassenger = async (req, res) => {
  const { email, systemUid } = req.query;

  try {
    const snapshot = await db.ref('p4zs3gr_usr_uu34').once('value');
    const data = snapshot.val();

    if (!data) {
      return res.status(200).json([]); // No data at all
    }

    const passengers = Object.entries(data).map(([uid, passenger]) => ({
      uid,
      ...passenger,
    }));

    if (email) {
      const result = passengers.find(p => p.email === email);
      if (!result) {
        return res.status(404).json({ error: 'Passenger with that email not found' });
      }
      return res.status(200).json(result);
    }

    if (systemUid) {
      const result = passengers.find(p => p.systemUid === systemUid);
      if (!result) {
        return res.status(404).json({ error: 'Passenger with that systemUid not found' });
      }
      return res.status(200).json(result);
    }

    // No query params = return all passengers
    return res.status(200).json(passengers);
  } catch (err) {
    console.error('❌ Error fetching passenger:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// 🔹 New: Get full passenger data by UID
const getPassengerData = async (req, res) => {
  const { uid } = req.params;

  if (!uid) {
    return res.status(400).json({ error: 'Missing UID parameter' });
  }

  try {
    const snapshot = await db.ref(`p4zs3gr_usr_uu34/${uid}`).once('value');
    const data = snapshot.val();

    if (!data) {
      return res.status(404).json({ error: 'Passenger not found with given UID' });
    }

    return res.status(200).json({ uid, ...data });
  } catch (err) {
    console.error('❌ Error fetching passenger by UID:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Edit Passenger Profile
const editPassengerProfile = async (req, res) => {
  const { uid } = req.params;
  const { firstName, lastName, middleName, contactNumber } = req.body;

  if (!uid) {
    return res.status(400).json({ error: 'Missing UID parameter' });
  }

  // Build update object with only provided allowed fields
  const updateData = {};
  if (firstName !== undefined) updateData.firstName = firstName;
  if (lastName !== undefined) updateData.lastName = lastName;
  if (middleName !== undefined) updateData.middleName = middleName;
  if (contactNumber !== undefined) updateData.contactNumber = contactNumber;

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No valid fields provided to update' });
  }

  try {
    const passengerRef = db.ref(`p4zs3gr_usr_uu34/${uid}`);
    const snapshot = await passengerRef.once('value');

    if (!snapshot.exists()) {
      return res.status(404).json({ error: 'Passenger not found' });
    }

    await passengerRef.update(updateData);

    return res.status(200).json({
      message: 'Passenger profile updated successfully',
      uid,
      updatedFields: updateData
    });
  } catch (err) {
    console.error('❌ Error updating passenger profile:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  registerPassenger,
  getPassenger,
  getPassengerData,
  editPassengerProfile
};
