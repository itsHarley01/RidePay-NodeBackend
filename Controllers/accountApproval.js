// accountApproval.js
require('dotenv').config();
const { db } = require('../config/firebase');
const Mailjet = require('node-mailjet');
const generateOTP = require("../utils/otpGenerator");
const { uploadRequirement } = require('./uploadRequirementController');

// 🔹 Mailjet init
const mailjet = Mailjet.apiConnect(
  process.env.MAILJET_API_KEY,
  process.env.MAILJET_SECRET_KEY
);

const approveAccount = async (req, res) => {
  const { uid } = req.params;
  const files = req.files;

  if (!uid) {
    return res.status(400).json({ message: "Missing uid" });
  }

  const userRef = db.ref(`user_us3r_4cc5/${uid}`);

  try {
    const snapshot = await userRef.get();

    if (!snapshot.exists()) {
      return res.status(404).json({ message: "User not found" });
    }

    const userData = snapshot.val();
    const email = userData.email;

    if (!email) {
      return res.status(400).json({ message: "User email not found" });
    }

    // 🔹 Upload files if any
    let uploadedFiles = [];
    if (files && files.length > 0) {
      uploadedFiles = await uploadRequirement(uid, files);
    }

    const now = new Date();
    const expiration = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const otpCode = generateOTP();

    const updates = {
      status: {
        ...userData.status,
        status: "approved",
        dateOfAccountApproval: now.toISOString(),
      },
      OTP: {
        code: otpCode,
        expiration: expiration.toISOString()
      },
    };

    await userRef.update(updates);

    // 🔹 Send OTP email via Mailjet
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
            Subject: 'Your Account Has Been Approved – OTP Inside',
            HTMLPart: `
              <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: auto;">
                <h2 style="color: #0A2A54;">RidePay Account Verification</h2>
                <p>
                  Hello ${
                    userData?.lastName && userData?.firstName
                      ? `${userData.lastName} ${userData.firstName}`
                      : "User"
                  },
                </p>
                <p>Your account has been approved. To activate it, please use the One-Time Password (OTP) below:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <span style="font-size: 28px; font-weight: bold; color: #f2be22;">
                    ${otpCode}
                  </span>
                </div>
                <p>This OTP is valid for <strong>24 hours</strong>.</p>
                <p>If you did not request this, please ignore this message.</p>
                <br />
                <p style="color: #808080;">Thank you, RIDEPAY Team</p>
              </div>
            `
          }
        ]
      });

    return res.status(200).json({
      message: "Account approved, requirements uploaded, and OTP sent via email",
      uploadedFiles,
      updates
    });

  } catch (error) {
    console.error("Error approving account:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message
    });
  }
};

module.exports = approveAccount;
