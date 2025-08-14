const express = require('express');
const { updateTariff, getTariff, setFixedEnabled } = require('../Controllers/tariffController');

const router = express.Router();

router.get('/tariff', getTariff);
router.put('/tariff', updateTariff); 
router.put('/tariff', setFixedEnabled); 

module.exports = router;