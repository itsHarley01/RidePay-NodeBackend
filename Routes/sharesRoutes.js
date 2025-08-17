const express = require('express');
const {
  getShares,
  updateShares,
} = require('../Controllers/sharePercentage'); // renamed handlers

const router = express.Router();

// Fetch all shares
router.get('/shares', getShares);
// Update DOTR & Coop shares
router.put('/shares', updateShares);


module.exports = router;
