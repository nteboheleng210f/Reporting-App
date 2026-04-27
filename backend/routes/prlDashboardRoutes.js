const express = require('express');
const router = express.Router();
// const { authenticateToken } = require('../middleware/auth');
const { getPRLStats } = require('../controllers/prlDashboardController');

// router.use(authenticateToken);

router.get('/stats', getPRLStats);

module.exports = router;