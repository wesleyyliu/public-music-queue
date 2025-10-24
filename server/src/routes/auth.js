const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Initiate Spotify OAuth flow
router.get('/spotify', authController.login);

// Spotify callback (after user authorizes)
router.get('/callback', authController.callback);

module.exports = router;

