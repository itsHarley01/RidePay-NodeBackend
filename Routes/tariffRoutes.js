const express = require('express');
const { updateTariff, getTariff } = require('../Controllers/tariffController');

const router = express.Router();

router.get('/tariff', getTariff);
router.put('/tariff', updateTariff); 

module.exports = router;