const express = require('express');
const { updateTariff, getTariff, setFixedEnabled, getFixedEnabled } = require('../Controllers/tariffController');

const router = express.Router();

router.get('/tariff', getTariff);
router.put('/tariff', updateTariff); 
router.put('/tariff/set', setFixedEnabled); 
router.get('/tariff/set', getFixedEnabled); 

module.exports = router;