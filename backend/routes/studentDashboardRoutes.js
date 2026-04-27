const express = require('express');
const router = express.Router();
const { getStudentStats, getUpcomingClass } = require('../controllers/studentDashboardController');

// Add middleware to extract student ID from header
router.use((req, res, next) => {
  const studentId = req.headers['x-user-id'];
  if (studentId) {
    req.user = { uid: studentId };
  }
  next();
});

router.get('/stats', getStudentStats);
router.get('/upcoming-class', getUpcomingClass);

module.exports = router;