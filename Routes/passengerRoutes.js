const express = require('express');
const router = express.Router();
const { getPassenger, registerPassenger } = require('../Controllers/passengerContoller');

router.post('/passengers', registerPassenger);
router.get('/passengers', getPassenger);

module.exports = router;
