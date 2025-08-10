const db = require('../config/firebase');
const { generateSystemUID } = require('../utils/systemUidGenerator');
const { generateUID } = require('../utils/generateUID');

const registerDriver = async (req, res) => {
  const {
    firstName,
    lastName,
    middleName,
    birthdate,
    gender,
    email,
    contactNumber,
    organization,
    operatorUnit,
    // bus
  } = req.body;

  // Validate required fields
  if (
    !firstName || !lastName || !birthdate || !gender ||
    !email || !contactNumber || !organization 
  ) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const systemUid = await generateSystemUID(); // Human-readable ID
  const uid = generateUID(); // Random 32-char UID
  const currentDate = new Date().toISOString();

  try {
    await db.ref(`user_us3r_4cc5/${uid}`).set({
      systemUid,
      firstName,
      lastName,
      middleName: middleName || '',
      birthdate,
      gender,
      email,
      contactNumber,
      operatorUnit,
      status: {
        dateOfAccountCreation: currentDate,
        status: 'pending'
      },
      role: 'driver',
      organization,
    //   bus
    });

    res.status(201).json({
      message: 'Driver account successfully created',
      uid,
      systemUid
    });
  } catch (err) {
    console.error('❌ Error registering driver:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { registerDriver };
