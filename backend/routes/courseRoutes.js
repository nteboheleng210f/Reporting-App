const express = require('express');
const router = express.Router();
// const { authenticateToken } = require('../middleware/auth');
const { getCourses, getCourseById, createCourse, getClasses, getLecturers } = require('../controllers/courseController');

// router.use(authenticateToken);

router.get('/', getCourses);
router.get('/classes', getClasses);
router.get('/lecturers', getLecturers);
router.get('/:courseId', getCourseById);
router.post('/', createCourse);

module.exports = router;