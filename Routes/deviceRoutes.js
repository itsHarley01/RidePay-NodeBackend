// routes/deviceRoutes.js
const express = require('express')
const router = express.Router()
const deviceController = require('../Controllers/deviceController')

router.post('/device', deviceController.addDevice)
router.get('/device', deviceController.getAllDevices)
router.get('/device/:uid', deviceController.getDeviceByUID)
router.put('/device/:uid', deviceController.updateDeviceByUID)

module.exports = router
