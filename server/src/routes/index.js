const express = require('express');
const router = express.Router();
const authRoutes = require('./auth');
const userRoutes = require('./users');
const spotifyRoutes = require('./spotify');
const queueRoutes = require('./queue');
const voteRoutes = require('./vote');

router.get('/', (req, res) => {
  res.json({ message: 'Q\'ed Up API' });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/spotify', spotifyRoutes);
router.use('/queue', queueRoutes);
router.use('/vote', voteRoutes);

module.exports = router;
