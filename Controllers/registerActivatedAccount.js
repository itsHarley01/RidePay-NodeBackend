// Controllers/registerActivatedAccount.js
const admin = require("firebase-admin");
const { db } = require('../config/firebase');

const registerActivatedAccount = async (req, res) => {
  const { email, password, old_uid } = req.body;

  if (!email || !password || !old_uid) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  try {
    // 1. Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
    });

    const newUid = userRecord.uid;

    // 2. Get old user data
    const oldUserSnap = await db.ref(`user_us3r_4cc5/${old_uid}`).once("value");
    const oldUserData = oldUserSnap.val();

    if (!oldUserData) {
      return res.status(404).json({ success: false, message: "Old user not found" });
    }

    // 3. Modify data
    const updatedData = { ...oldUserData };

    // Remove OTP field
    delete updatedData.OTP;

    // Update status
    const now = new Date().toISOString();
    updatedData.status.status = "activated";
    updatedData.status.dateOfAccountActivation = now;

    // 4. Save to r3g1s_user_us3r_4cc5 with new UID
    await db.ref(`r3g1s_user_us3r_4cc5/${newUid}`).set(updatedData);

    // Optional: Remove old entry
    await db.ref(`user_us3r_4cc5/${old_uid}`).remove();

    return res.status(200).json({
      success: true,
      message: "Account registered and activated successfully",
      uid: newUid,
    });
  } catch (error) {
    console.error("Error during registration:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

module.exports = registerActivatedAccount;
