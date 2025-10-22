const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Public Music Queue API' });
});

module.exports = router;
