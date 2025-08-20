const express = require("express");
const multer = require("multer");
const router = express.Router();
const approveAccount = require("../Controllers/accountApproval");
const verifyAccountActivation = require("../Controllers/verifyAccountActivation");
const registerActivatedAccount = require("../Controllers/registerActivatedAccount");
const { getAdminDetails, updateAdminDetails } = require("../Controllers/editAdminController");
const { getDriverDetails, updateDriverDetails } = require("../Controllers/editDriverController");
const { getAllDrivers, getDriverById } = require('../Controllers/getAllDrivers');
const { sendPasswordReset } = require("../Controllers/sendPasswordResetController");

const upload = multer({ storage: multer.memoryStorage() });

router.patch("/approve-account/:uid", upload.array("files"), approveAccount);
router.post("/verify-account", verifyAccountActivation);
router.post("/register-final-account", registerActivatedAccount);

router.get('/admin-edit/:uid', getAdminDetails);
router.put('/admin-edit/:uid', updateAdminDetails);

router.get('/driver-edit/:uid', getDriverDetails);
router.put('/driver-edit/:uid', updateDriverDetails);

router.get('/drivers', getAllDrivers);
router.get('/driver/:id', getDriverById);

router.post('/auth/send-password-reset', sendPasswordReset);


module.exports = router;
