const express = require('express');
const { topUpUserBalance } = require('../Controllers/topUpController');

const router = express.Router();

router.post('/topup', topUpUserBalance);

module.exports = router;