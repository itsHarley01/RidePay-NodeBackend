const express = require('express');
const router = express.Router();
const { tapBus, driverBusTap, distanceBasedBusTap } = require('../Controllers/busTapController');

router.post('/tap', tapBus);
router.post('/tap/d', driverBusTap);
router.post('/tap/db', distanceBasedBusTap);

module.exports = router;
