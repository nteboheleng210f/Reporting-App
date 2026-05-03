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


router.get('/courses',              getStudentCourses);   
router.get('/check',                hasRated);            
router.get('/mine',                 getMyRatings);        
router.get('/all',                  getAllRatings);        
router.get('/debug',                debugAllRatings);     
router.get('/lecturer/:lecturerId', getLecturerRatings);  
router.post('/',                    submitRating);       

module.exports = router;