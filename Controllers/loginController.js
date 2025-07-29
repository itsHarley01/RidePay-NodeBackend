// Controllers/loginController.js

const jwt = require('jsonwebtoken');
const { getAuth } = require('firebase-admin/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret'; // keep this in .env

const loginController = async (req, res) => {
  const { email, password } = req.body;

  try {
    const auth = getAuth();

    // Try to sign in using Firebase Auth REST API
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

    // Generate JWT Token
    const token = jwt.sign({ uid, email }, JWT_SECRET, { expiresIn: '1h' });

    return res.status(200).json({
      message: 'Login successful',
      token,
      uid,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Login failed' });
  }
};

module.exports = loginController;
