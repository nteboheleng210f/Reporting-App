// monitoringRoutes.js
const express = require('express');
const router = express.Router();
const { 
  getStudentMonitoring,
  getLecturerMonitoring,
  getPRLMonitoring,
  getPLMonitoring
} = require('../controllers/monitoringController');

// Role-specific endpoints
router.get('/student', getStudentMonitoring);
router.get('/lecturer', getLecturerMonitoring);
router.get('/prl', getPRLMonitoring);
router.get('/pl', getPLMonitoring);

module.exports = router;