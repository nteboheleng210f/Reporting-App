const express = require('express');
const router = express.Router();

const {
  getCourses,
  getStudentCourses,
  getLecturerCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  updateCourseLecturer,
  getClasses,
  getLecturers,
} = require('../controllers/courseController');

// Static/named routes FIRST — before any :param routes
router.get('/student',              getStudentCourses);
router.get('/mine',                 getLecturerCourses);
router.get('/classes',              getClasses);
router.get('/lecturers',            getLecturers);

// Base routes
router.get('/',                     getCourses);
router.post('/',                    createCourse);

// Param routes LAST
router.get('/:courseId',            getCourseById);
router.put('/:courseId',            updateCourse);
router.delete('/:courseId',         deleteCourse);
router.patch('/:courseId/lecturer', updateCourseLecturer);

module.exports = router;