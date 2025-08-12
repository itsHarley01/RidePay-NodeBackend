const express = require('express');
const router = express.Router();
const {
  createRequirement,
  getRequirements,
  updateRequirement,
  deleteRequirement
} = require('../Controllers/requirementsController');

router.post('req/:category', createRequirement);
router.get('req/:category', getRequirements);
router.put('req/:category/:id', updateRequirement);
router.delete('req/:category/:id', deleteRequirement);

module.exports = router;
