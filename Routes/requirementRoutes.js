const express = require('express');
const router = express.Router();
const {
  createRequirement,
  getRequirements,
  updateRequirement,
  deleteRequirement,
} = require('../Controllers/requirementsController');

router.post('/req', createRequirement);
router.get('/req/:category', getRequirements);
router.put('/req/:id', updateRequirement);
router.delete('/req/:id', deleteRequirement);

module.exports = router;
