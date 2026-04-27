const express = require('express');
const router = express.Router();
// const { authenticateToken } = require('../middleware/auth');
const { getStudentStats, getUpcomingClass } = require('../controllers/studentDashboardController');

// router.use(authenticateToken);

router.get('/stats', getStudentStats);
router.get('/upcoming-class', getUpcomingClass);

module.exports = router;