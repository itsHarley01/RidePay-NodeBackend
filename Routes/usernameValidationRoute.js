const express = require("express");
const router = express.Router();
const { validateUsername } = require("../Controllers/usernameValidationController");

router.post("/validate-username", validateUsername);

module.exports = router;
