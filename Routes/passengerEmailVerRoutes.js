const express = require("express");
const router = express.Router();
const {
  sendUserOtp,
  verifyUserOtp,
} = require("../Controllers/passengerEmailVerController");

router.post("/send-otp", sendUserOtp);
router.post("/verify-otp", verifyUserOtp);

module.exports = router;
