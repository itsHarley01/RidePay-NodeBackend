const express = require('express');
const router = express.Router();

const { getUserDetails } = require('../controllers/userController');
const { getAllUsers } = require('../Controllers/getAllUsers'); 

// Route to fetch a single user by UID
router.get('/user/:uid', getUserDetails);
// Example: /api/user?role=admin&search=harley
router.get('/user', getAllUsers);

module.exports = router;
