const express = require('express');
const router = express.Router();
const { 
  getStudentAttendance, 
  getCourseStudents, 
  markAttendance 
} = require('../controllers/attendanceController');

// Student route - get attendance records
router.get('/student', getStudentAttendance);

// Lecturer routes
router.get('/course/:courseId/students', getCourseStudents);
router.post('/mark', markAttendance);

module.exports = router;