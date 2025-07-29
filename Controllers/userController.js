// controllers/userController.js
const db = require('../config/firebase');

const getUserDetails = async (req, res) => {
  const { uid } = req.params;

  try {
    const [unregisteredSnap, registeredSnap] = await Promise.all([
      db.ref(`user_us3r_4cc5/${uid}`).once('value'),
      db.ref(`r3g1s_user_us3r_4cc5/${uid}`).once('value')
    ]);

    const unregisteredUser = unregisteredSnap.val();
    const registeredUser = registeredSnap.val();

    if (!unregisteredUser && !registeredUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prefer registered user if both exist, otherwise return whichever exists
    const user = registeredUser || unregisteredUser;

    return res.status(200).json({
      uid,
      ...user
    });
  } catch (err) {
    console.error('Error fetching user:', err);
    return res.status(500).json({ message: 'Failed to fetch user details' });
  }
};

module.exports = { getUserDetails };
