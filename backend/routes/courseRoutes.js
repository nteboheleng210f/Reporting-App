const express = require('express');
const router = express.Router();

const {
  getCourses,
  getStudentCourses,
  getLecturerCourses,
  getCourseById,
  createCourse,
  getClasses,
  getLecturers,
} = require('../controllers/courseController');

router.get('/student',     getStudentCourses);
router.get('/mine',        getLecturerCourses);
router.get('/classes',     getClasses);
router.get('/lecturers',   getLecturers);
router.get('/',            getCourses);
router.get('/:courseId',   getCourseById);
router.post('/',           createCourse);

module.exports = router;