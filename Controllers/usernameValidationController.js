const {db} = require('../config/firebase');
const { decrypt } = require('../utils/encrypt');

const validateUsername = async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    const snapshot = await db.ref('user_us3r_4cc').once('value');
    const users = snapshot.val();

    let isTaken = false;

    if (users) {
      for (const userId in users) {
        const encryptedUsername = users[userId].us3r_name;
        const decryptedUsername = decrypt(encryptedUsername);

        if (decryptedUsername === username) {
          isTaken = true;
          break;
        }
      }
    }

    return res.status(200).json({ isTaken });
  } catch (err) {
    console.error('Error validating username:', err);
    return res.status(500).json({ error: 'Server error while validating username' });
  }
};

module.exports = { validateUsername };
