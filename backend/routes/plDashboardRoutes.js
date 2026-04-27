const express = require('express');
const router = express.Router();
//const { authenticateToken, checkRole } = require('../middleware/auth');
const { getPLStats, getRecentActivity } = require('../controllers/plDashboardController');

//router.use(authenticateToken);
//router.use(checkRole(['pl']));

router.get('/stats', getPLStats);
router.get('/recent-activity', getRecentActivity);

module.exports = router;