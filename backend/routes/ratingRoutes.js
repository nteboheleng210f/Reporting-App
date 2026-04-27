const express = require('express');
const router = express.Router();
// const { authenticateToken } = require('../middleware/auth');
const { submitRating, getLecturerRatings, getAllRatings, getStudentCourses, hasRated } = require('../controllers/ratingController');

// router.use(authenticateToken);

router.get('/courses', getStudentCourses);
router.get('/check', hasRated);
router.get('/lecturer/:lecturerId', getLecturerRatings);
router.get('/all', getAllRatings);
router.get('/', getAllRatings);
router.post('/', submitRating);

module.exports = router;