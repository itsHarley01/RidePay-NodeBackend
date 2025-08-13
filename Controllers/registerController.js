const { db } = require('../config/firebase');
const { generateSystemUID } = require('../utils/systemUidGenerator');
const { generateUID } = require('../utils/generateUID');

const registerUser = async (req, res) => {
  const {
    firstName,
    lastName,
    middleName,
    birthdate,
    gender,
    email,
    contactNumber,
    role,
    organization,
    operatorUnit
  } = req.body;

  if (
    !firstName || !lastName || !birthdate || !gender ||
    !email || !contactNumber || !role || !organization
  ) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const systemUid = await generateSystemUID(); // human-readable ID
  const uid = generateUID(); // secure unique database key

  const currentDate = new Date().toISOString(); // or format as 'yyyy-MM-dd' if preferred

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
      role,
      organization
    });

    res.status(201).json({
      message: 'Account successfully created',
      uid,
      systemUid
    });
  } catch (err) {
    console.error('Error creating account:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { registerUser };
