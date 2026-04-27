const express = require('express');
const router = express.Router();
const { 
  getMonitoringData, 
  getStudentAttendanceMonitoring,
  getLecturerReports,
  getPRLReviewData,
  getPLOverview
} = require('../controllers/monitoringController');

// Main monitoring endpoint (role-based)
router.get('/', getMonitoringData);

// Role-specific endpoints
router.get('/student', getStudentAttendanceMonitoring);
router.get('/lecturer', getLecturerReports);
router.get('/prl', getPRLReviewData);
router.get('/pl', getPLOverview);

module.exports = router;