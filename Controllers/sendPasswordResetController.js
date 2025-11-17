require('dotenv').config();
const { db } = require('../config/firebase');
const admin = require("firebase-admin");
const Mailjet = require('node-mailjet');

const USERS_PATHS = [
  'r3g1s_user_us3r_4cc5',
  'p4zs3gr_usr_uu34'
];

const mailjet = Mailjet.apiConnect(
  process.env.MAILJET_API_KEY,
  process.env.MAILJET_SECRET_KEY
);

const sendPasswordReset = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    let foundUid = null;

    for (const path of USERS_PATHS) {
      const snapshot = await db.ref(path).once('value');
      const users = snapshot.val();

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

      if (foundUid) break;
    }

    if (!foundUid) {
      return res.status(404).json({ message: 'Email not found in the database' });
    }

    try {
      await admin.auth().getUserByEmail(email);
    } catch (authError) {
      return res.status(404).json({ message: 'Email not registered in Firebase Authentication' });
    }

    const resetLink = await admin.auth().generatePasswordResetLink(email);

    await mailjet
      .post('send', { version: 'v3.1' })
      .request({
        Messages: [
          {
            From: {
              Email: process.env.MAILJET_SENDER_EMAIL,
              Name: "RidePay"
            },
            To: [
              {
                Email: email
              }
            ],
            Subject: "RidePay | Reset Your Password",
            HTMLPart: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px; border: 1px solid #e0e0e0;">
                <h2 style="color: #2c3e50; text-align: center;">RidePay Password Reset</h2>
                <p style="color: #333; font-size: 15px;">Hello,</p>
                <p style="color: #333; font-size: 15px;">We received a request to reset your RidePay account password. Click the button below:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetLink}" target="_blank" style="background-color: #4CAF50; color: white; padding: 14px 28px; text-decoration: none; font-size: 16px; border-radius: 6px; display: inline-block;">
                    Reset Password
                  </a>
                </div>
                <p style="color: #333; font-size: 14px;">If you didn’t request this, ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                <p style="color: #999; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} RidePay. All rights reserved.</p>
              </div>
            `
          }
        ]
      });

    return res.status(200).json({ message: 'Password reset email sent successfully' });

  } catch (error) {
    console.error("Error sending password reset email:", error);
    return res.status(500).json({ message: 'Failed to send password reset email' });
  }
};

module.exports = { sendPasswordReset };
