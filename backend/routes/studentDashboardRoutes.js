const express = require('express');
const router  = express.Router();

// ✅ Fixed: import getTimetable not getUpcomingClass
const { getStudentStats, getTimetable } = require('../controllers/studentDashboardController');

router.use((req, res, next) => {
  const studentId = req.headers['x-user-id'];
  if (studentId) req.user = { uid: studentId };
  next();
});

router.get('/stats',     getStudentStats);
router.get('/timetable', getTimetable);   // ✅ was missing, caused 404

module.exports = router;