const express = require("express");
const router = express.Router();
const { validateUsername } = require("../controllers/usernameValidationController");

router.post("/validate-username", validateUsername);

module.exports = router;
