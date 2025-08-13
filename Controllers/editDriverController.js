const { db } = require('../config/firebase');

const allowedUpdateFields = [
  'firstName',
  'lastName',
  'middleName',
  'birthdate',
  'contactNumber',
  'organization',
  'role',
  'email',
  'operatorUnit' 
//   'bus', // specific to drivers
];

// Helper to fetch driver by UID from both tables
const getDriverByUid = async (uid) => {
  const tables = ['user_us3r_4cc5', 'r3g1s_user_us3r_4cc5'];

  for (const table of tables) {
    const snapshot = await db.ref(`${table}/${uid}`).once('value');
    const data = snapshot.val();

    // Optional: confirm it's actually a driver
    if (snapshot.exists() && data?.role === 'driver') {
      return { data, path: `${table}/${uid}` };
    }
  }

  return null;
};

// GET /driver-edit/:uid
const getDriverDetails = async (req, res) => {
  const { uid } = req.params;

  try {
    const result = await getDriverByUid(uid);
    if (!result) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    return res.status(200).json({ uid, ...result.data });
  } catch (error) {
    console.error('Error fetching driver:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PUT /driver-edit/:uid
const updateDriverDetails = async (req, res) => {
  const { uid } = req.params;
  const updates = req.body;

  try {
    const result = await getDriverByUid(uid);
    if (!result) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    const { data: existingDriver, path } = result;
    const fieldsToUpdate = {};

    for (const key of allowedUpdateFields) {
      if (updates.hasOwnProperty(key)) {
        const incoming = updates[key];
        const current = existingDriver[key];

        if (key === 'email' && incoming !== current) {
          if ((existingDriver.status?.status ?? '') !== 'pending') {
            return res.status(403).json({ message: 'Email cannot be changed unless status is pending' });
          }
        }

        if (incoming !== current) {
          fieldsToUpdate[key] = incoming;
        }
      }
    }

    if (Object.keys(fieldsToUpdate).length === 0) {
      return res.status(200).json({ message: 'No changes detected' });
    }

    await db.ref(path).update(fieldsToUpdate);
    return res.status(200).json({ message: 'Driver updated successfully', updated: fieldsToUpdate });

  } catch (error) {
    console.error('Error updating driver:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getDriverDetails,
  updateDriverDetails,
};
