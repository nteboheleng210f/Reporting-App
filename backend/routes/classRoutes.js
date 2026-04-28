const express = require('express');
const router = express.Router();

const {
  getClasses,
  getLecturerClasses,
  createClass,
  getClassStudents,
  assignStudent,
  getClassById,
} = require('../controllers/classController');


router.get('/mine', getLecturerClasses);
router.get('/', getClasses);
router.get('/:classId/students', getClassStudents);
router.post('/', createClass);
router.post('/assign', assignStudent);
router.get('/:classId', getClassById);

module.exports = router;