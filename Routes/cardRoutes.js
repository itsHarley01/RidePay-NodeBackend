const express = require('express')
const router = express.Router()
const cardController = require('../Controllers/cardController')
const card = require('../Controllers/cardIssuanceController')

router.get('/card/price', cardController.getCardPrice)
router.put('/card/price', cardController.updateCardPrice)
router.post('/card/issuance', card.issueCard)
router.get('/card/issuance', card.scanCard)
router.get('/card/cards', cardController.getAllCards)


module.exports = router
