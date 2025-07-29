const express = require('express');
const router = express.Router();
const { addBus } = require('../Controllers/AddBusController');
const { getBusById, updateBusById } = require('../Controllers/editBusController');
const { getAllBuses } = require('../Controllers/getAllBus');

router.post('/add-bus', addBus);
router.get('/bus-edit/:id', getBusById);
router.put('/bus-edit/:id', updateBusById);
router.get('/buses', getAllBuses);

module.exports = router;
