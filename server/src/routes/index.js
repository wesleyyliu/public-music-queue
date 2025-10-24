const express = require('express');
const router = express.Router();
const authRoutes = require('./auth');
const userRoutes = require('./users');

router.get('/', (req, res) => {
  res.json({ message: 'Public Music Queue API' });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);

module.exports = router;
