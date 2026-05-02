const express = require('express');
const router = express.Router();

const {
  submitRating,
  getAllRatings,
  getMyRatings,
  getStudentCourses,
  getLecturerRatings,
  hasRated,
} = require('../controllers/ratingController');

router.get('/courses',      getStudentCourses);
router.get('/mine',         getMyRatings);
router.get('/check',        hasRated);
router.get('/lecturer/me',  getLecturerRatings);
router.get('/all',          getAllRatings);
router.post('/',            submitRating);

module.exports = router;