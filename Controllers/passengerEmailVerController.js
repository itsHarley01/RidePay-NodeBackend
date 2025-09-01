const generateOTP = require('../utils/otpGenerator'); // your existing util
const { db } = require('../config/firebase');
const nodemailer = require('nodemailer');

// Setup Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail', // or smtp server you use
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// 1. Send OTP
const sendUserOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    // Generate 4-char OTP
    const otp = generateOTP(4);

    // Generate random ID
    const newOtpRef = db.ref('temp-user-otp').push();
    await newOtpRef.set({
      email,
      otp,
      createdAt: Date.now(),
    });

    // Send email with OTP
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: 'Your Verification Code',
      html: `
        <h2>Email Verification</h2>
        <p>Your OTP code is:</p>
        <h1 style="color:#0A2A54">${otp}</h1>
        <p>This code will expire in 5 minutes.</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res.json({ success: true, message: 'OTP sent to email' });
  } catch (error) {
    console.error('Error sending OTP:', error);
    return res.status(500).json({ error: 'Failed to send OTP' });
  }
};

// 2. Verify OTP
const verifyUserOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });

    // Find OTP entries for this email
    const snapshot = await db.ref('temp-user-otp')
      .orderByChild('email')
      .equalTo(email)
      .once('value');

    if (!snapshot.exists()) {
      return res.status(400).json({ error: 'No OTP found for this email' });
    }

    let matchedKey = null;
    let data = null;

    snapshot.forEach(child => {
      const value = child.val();
      if (value.otp === otp) {
        matchedKey = child.key;
        data = value;
      }
    });

    if (!matchedKey) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Check expiry (5 minutes)
    const isExpired = Date.now() - data.createdAt > 5 * 60 * 1000;
    if (isExpired) {
      await db.ref(`temp-user-otp/${matchedKey}`).remove();
      return res.status(400).json({ error: 'OTP expired' });
    }

    // ✅ Valid OTP
    await db.ref(`temp-user-otp/${matchedKey}`).remove(); // cleanup
    return res.json({ success: true, message: 'OTP verified' });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return res.status(500).json({ error: 'Failed to verify OTP' });
  }
};

module.exports = {
  sendUserOtp,
  verifyUserOtp,
};
