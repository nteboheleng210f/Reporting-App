const express = require('express');
const router = express.Router();
const { 
  getPRLStats, 
  getPRLCourses, 
  getPendingReports, 
  submitFeedback 
} = require('../controllers/prlDashboardController');

router.get('/stats', getPRLStats);
router.get('/courses', getPRLCourses);
router.get('/pending-reports', getPendingReports);
router.put('/reports/:reportId/feedback', submitFeedback);

module.exports = router;