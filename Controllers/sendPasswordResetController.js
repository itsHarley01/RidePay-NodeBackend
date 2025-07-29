require('dotenv').config(); // Load env variables
const db = require('../config/firebase');
const admin = require("firebase-admin");
const nodemailer = require('nodemailer');

const USERS_PATH = 'r3g1s_user_us3r_4cc5';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const sendPasswordReset = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    // 🔍 Look for the email in the Realtime Database
    const snapshot = await db.ref(USERS_PATH).once('value');
    const users = snapshot.val();

    let foundUid = null;

    if (users) {
      for (const uid in users) {
        const dbEmail = String(users[uid]?.email || '').toLowerCase();
        const inputEmail = String(email || '').toLowerCase();

        if (dbEmail === inputEmail) {
          foundUid = uid;
          break;
        }
      }
    }

    if (!foundUid) {
      return res.status(404).json({ message: 'Email not found in the database' });
    }

    // ✅ Check if the email is registered in Firebase Auth
    try {
      await admin.auth().getUserByEmail(email);
    } catch (authError) {
      return res.status(404).json({ message: 'Email not registered in Firebase Authentication' });
    }

    // 🔗 Generate password reset link
    const resetLink = await admin.auth().generatePasswordResetLink(email);

    // 📧 Send the email using Nodemailer
    await transporter.sendMail({
      from: `"Your App Name" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Reset Your Password',
      html: `
        <p>Hello,</p>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetLink}" target="_blank">${resetLink}</a>
        <p>If you didn’t request this, please ignore this email.</p>
      `
    });

    return res.status(200).json({ message: 'Password reset email sent successfully' });

  } catch (error) {
    console.error('Error sending password reset email:', error);
    return res.status(500).json({ message: 'Failed to send password reset email' });
  }
};

module.exports = {
  sendPasswordReset,
};
