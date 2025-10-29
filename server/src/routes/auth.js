const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Initiate Spotify OAuth flow
router.get('/spotify', authController.login);

// Spotify callback (after user authorizes)
router.get('/callback', authController.callback);

// Session-based routes
router.get('/me', authController.getCurrentUser);
router.get('/token', authController.getAccessToken);
router.post('/logout', authController.logout);

module.exports = router;

