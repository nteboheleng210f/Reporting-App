const express = require('express');
const router = express.Router();
const {
  submitRating,
  getAllRatings,
  getMyRatings,
  getStudentCourses,
  getLecturerRatings,
  hasRated,
  debugAllRatings,
} = require('../controllers/ratingController');

router.get('/courses', getStudentCourses);
router.get('/mine', getMyRatings);
router.post('/', submitRating);
router.get('/has-rated/:courseId?', hasRated);


router.get('/lecturer/me', getLecturerRatings);

router.get('/all', getAllRatings);


router.get('/debug', debugAllRatings);

module.exports = router;