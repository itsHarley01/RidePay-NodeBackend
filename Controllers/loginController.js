const jwt = require('jsonwebtoken');
const { getAuth } = require('firebase-admin/auth');
const { decrypt } = require('../utils/encrypt');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

const loginController = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check for dev superadmin login first
    const devEmail = process.env.DEV_SUPERADMIN_EMAIL;
    const devEncryptedPassword = process.env.DEV_SUPERADMIN_PASSWORD_ENCRYPTED;
    const devPassword = decrypt(devEncryptedPassword);

    if (email === devEmail && password === devPassword) {
      const tokenPayload = {
        email,
        role: process.env.DEV_SUPERADMIN_ROLE,
        firstName: process.env.DEV_SUPERADMIN_FIRST_NAME,
        lastName: process.env.DEV_SUPERADMIN_LAST_NAME,
        isDev: true,
      };

      const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1h' });

      return res.status(200).json({
        message: 'Dev superadmin login successful',
        token,
        ...tokenPayload,
      });
    }

    // If not dev, try Firebase Auth login
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      }
    );

    const data = await response.json();

    if (data.error) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const uid = data.localId;

    const token = jwt.sign({ uid, email, isDev: false }, JWT_SECRET, { expiresIn: '1h' });

    return res.status(200).json({
      message: 'Login successful',
      token,
      uid,
      email,
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Login failed' });
  }
};

module.exports = loginController;
