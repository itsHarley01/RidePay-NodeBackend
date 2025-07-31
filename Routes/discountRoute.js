const express = require('express');
const router = express.Router();
const { updateDiscount, getDiscounts } = require('../Controllers/discountController');

// PATCH /api/discount/:type (expects { rate?, validity? } in body)
router.patch('/discount/:type', async (req, res) => {
  const { type } = req.params;
  const { rate, validity } = req.body;

  const result = await updateDiscount(type, { rate, validity });
  res.status(result.success ? 200 : 400).json(result);
});

// GET /api/discount (fetch all)
router.get('/discount', async (req, res) => {
  const result = await getDiscounts();
  res.status(result.success ? 200 : 500).json(result);
});

module.exports = router;
