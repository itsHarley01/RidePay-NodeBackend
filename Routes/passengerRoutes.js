const express = require('express');
const router = express.Router();
const { getPassenger, registerPassenger, getPassengerData, editPassengerProfile } = require('../Controllers/passengerContoller');
const loginPassengerController = require('../Controllers/loginPassengerController');

router.post('/passengers', registerPassenger);
router.get('/passengers', getPassenger);
router.get('/passengers', getPassenger);
router.get('/passengers/user/:uid', getPassengerData);
router.post('/passengers/login', loginPassengerController);
router.put('/passengers/edit/:uid', editPassengerProfile);

module.exports = router;
