const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Update user location
router.post('/location', userController.updateLocation);

module.exports = router;

