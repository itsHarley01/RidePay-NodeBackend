const admin = require('firebase-admin');

const db = admin.database();

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
];

// Helper to fetch user by UID from both tables
const getUserByUid = async (uid) => {
  const tables = ['user_us3r_4cc5', 'r3g1s_user_us3r_4cc5'];

  for (const table of tables) {
    const snapshot = await db.ref(`${table}/${uid}`).once('value');
    if (snapshot.exists()) {
      return { data: snapshot.val(), path: `${table}/${uid}` };
    }
  }

  return null;
};

// GET Controller
const getAdminDetails = async (req, res) => {
  const { uid } = req.params;

  try {
    const result = await getUserByUid(uid);
    if (!result) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ uid, ...result.data });
  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PUT Controller
const updateAdminDetails = async (req, res) => {
  const { uid } = req.params;
  const updates = req.body;

  try {
    const result = await getUserByUid(uid);
    if (!result) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { data: existingUser, path } = result;
    const fieldsToUpdate = {};

    for (const key of allowedUpdateFields) {
      if (updates.hasOwnProperty(key)) {
        const incoming = updates[key];
        const current = existingUser[key];

        if (key === 'email' && incoming !== current) {
          if ((existingUser.status?.status ?? '') !== 'pending') {
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
    return res.status(200).json({ message: 'User updated successfully', updated: fieldsToUpdate });

  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getAdminDetails,
  updateAdminDetails,
};
