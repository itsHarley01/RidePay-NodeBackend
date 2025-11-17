const generateOTP = require('../utils/otpGenerator');
const { db } = require('../config/firebase');
const Mailjet = require('node-mailjet');

// Setup Mailjet
const mailjet = Mailjet.apiConnect(
  process.env.MAILJET_API_KEY,
  process.env.MAILJET_SECRET_KEY
);

// 1. Send OTP
const sendUserOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const existingUserSnap = await db.ref("p4zs3gr_usr_uu34")
      .orderByChild("email")
      .equalTo(email)
      .once("value");

    if (existingUserSnap.exists()) {
      return res.status(400).json({ error: "Email is already in use" });
    }

    const otp = generateOTP(4);

    const newOtpRef = db.ref("temp-user-otp").push();
    await newOtpRef.set({
      email,
      otp,
      createdAt: Date.now(),
    });

    // Mailjet send email
    await mailjet
      .post("send", { version: "v3.1" })
      .request({
        Messages: [
          {
            From: {
              Email: process.env.MAILJET_SENDER_EMAIL,
              Name: "RidePay"
            },
            To: [{ Email: email }],
            Subject: "Your Verification Code",
            HTMLPart: `
              <h2>Email Verification</h2>
              <p>Your OTP code is:</p>
              <h1 style="color:#0A2A54">${otp}</h1>
              <p>This code will expire in 5 minutes.</p>
            `
          }
        ]
      });

    return res.json({ success: true, message: "OTP sent to email" });
  } catch (error) {
    console.error("Error sending OTP:", error);
    return res.status(500).json({ error: "Failed to send OTP" });
  }
};


// 2. Verify OTP — unchanged
const verifyUserOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });

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

    const isExpired = Date.now() - data.createdAt > 5 * 60 * 1000;
    if (isExpired) {
      await db.ref(`temp-user-otp/${matchedKey}`).remove();
      return res.status(400).json({ error: 'OTP expired' });
    }

    await db.ref(`temp-user-otp/${matchedKey}`).remove();
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
