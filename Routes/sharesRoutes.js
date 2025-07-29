const express = require('express');
const {
  getShares,
  updateMainShares,
  updateOperatorShares,
} = require('../Controllers/sharePercentage'); // renamed handlers

const router = express.Router();

// Fetch all shares
router.get('/shares', getShares);

// Update DOTR & Coop shares
router.put('/shares/main', updateMainShares);

// Update Operator & Driver shares
router.put('/shares/operator', updateOperatorShares);

module.exports = router;
