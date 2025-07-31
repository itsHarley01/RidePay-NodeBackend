// controllers/loginPassengerController.js

const jwt = require('jsonwebtoken');
const fetch = require('node-fetch'); // if not available globally
const db = require('../config/firebase');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

const loginPassengerController = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
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

    // OPTIONAL: Check if the user exists in the passenger database
    const passengerSnap = await db.ref(`p4zs3gr_usr_uu34/${uid}`).once('value');
    const passengerData = passengerSnap.val();

    if (!passengerData) {
      return res.status(404).json({ message: 'Passenger account not found' });
    }

    const token = jwt.sign({ uid, email }, JWT_SECRET, { expiresIn: '1h' });

    return res.status(200).json({
      message: 'Login successful',
      token,
      uid,
    });
  } catch (error) {
    console.error('❌ Passenger Login Error:', error);
    return res.status(500).json({ message: 'Login failed' });
  }
};

module.exports = loginPassengerController;
