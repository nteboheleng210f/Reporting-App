const express = require('express');
const router = express.Router();
// const { authenticateToken } = require('../middleware/auth');
const { getLecturerStats } = require('../controllers/dashboardController');

// router.use(authenticateToken);

router.get('/lecturer', getLecturerStats);

module.exports = router;