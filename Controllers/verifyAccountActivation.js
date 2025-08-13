// Controllers/verifyAccountActivation.js
const { db } = require('../config/firebase');

const verifyAccountActivation = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const snapshot = await db.ref("user_us3r_4cc5").once("value");
    const users = snapshot.val();

    if (!users) {
      return res.status(404).json({ success: false, message: "No users found" });
    }

    let matchedUser = null;

    // Loop through each user
    Object.entries(users).forEach(([uid, userData]) => {
      const userEmail = userData?.email;
      const userOTP = userData?.OTP?.code;

      if (userEmail === email && userOTP === otp) {
        matchedUser = { uid, email: userEmail };
      }
    });

    if (matchedUser) {
      return res.status(200).json({
        success: true,
        message: "OTP verified successfully",
        uid: matchedUser.uid
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Email and OTP do not match"
      });
    }
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

module.exports = verifyAccountActivation;
