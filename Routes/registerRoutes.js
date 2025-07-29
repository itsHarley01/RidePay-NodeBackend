const express = require('express');
const router = express.Router();
const { registerUser } = require('../controllers/registerController');
const { registerDriver } = require('../Controllers/registerDriverController');

router.post('/register', registerUser);
router.post('/register/driver', registerDriver);

module.exports = router;
