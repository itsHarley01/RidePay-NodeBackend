const express = require('express');
const router = express.Router();
const { tapBus, driverBusTap } = require('../Controllers/busTapController');

router.post('/tap', tapBus);
router.post('/tap/d', driverBusTap);

module.exports = router;
