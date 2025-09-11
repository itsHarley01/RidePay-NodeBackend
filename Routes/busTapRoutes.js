const express = require('express');
const router = express.Router();
const { tapBus, driverBusTap, distanceBasedBusTap, qrTapBus } = require('../Controllers/busTapController');

router.post('/tap', tapBus);
router.post('/tap/d', driverBusTap);
router.post('/tap/db', distanceBasedBusTap);
router.post('/tap/mqr', qrTapBus);

module.exports = router;
