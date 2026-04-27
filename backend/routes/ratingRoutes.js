const express = require('express');
const router = express.Router();
const { 
  submitRating, 
  getAllRatings, 
  getMyRatings,  // ADD THIS
  getStudentCourses, 
  getLecturerRatings, 
  hasRated 
} = require('../controllers/ratingController');

router.get('/courses', getStudentCourses);
router.get('/check', hasRated);
router.get('/mine', getMyRatings);  // ADD THIS - student's own ratings
router.get('/all', getAllRatings);
router.get('/lecturer/:lecturerId', getLecturerRatings);
router.post('/', submitRating);

module.exports = router;