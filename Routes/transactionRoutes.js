// routes/transactions.js
const express = require('express');
const { createTransaction, getTransactions } = require('../Controllers/transactionsController');

const router = express.Router();

router.post('/transactions', createTransaction);
router.get('/transactions', getTransactions);

module.exports = router;
