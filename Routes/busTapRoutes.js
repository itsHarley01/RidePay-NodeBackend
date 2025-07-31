const express = require('express');
const router = express.Router();
const { tapBus } = require('../Controllers/busTapController');

router.post('/tap', tapBus);

module.exports = router;
