const express = require('express');
const router = express.Router();
// COMMENT OUT ALL AUTH
// const { authenticateToken } = require('../middleware/auth');
const { getClasses, createClass, getClassStudents, assignStudent, getClassById } = require('../controllers/classController');

// COMMENT OUT THIS LINE
// router.use(authenticateToken);

// All routes - NO AUTH at all
router.get('/', getClasses);
router.get('/:classId', getClassById);
router.get('/:classId/students', getClassStudents);
router.post('/', createClass);
router.post('/assign', assignStudent);

module.exports = router;