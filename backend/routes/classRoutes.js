const express = require('express');
const router = express.Router();

const {
  getClasses,
  getLecturerClasses,
  createClass,
  updateClass,
  deleteClass,
  getClassStudents,
  assignStudent,
  unassignStudent,
  getClassById,
} = require('../controllers/classController');

// Static/named routes FIRST
router.get('/mine', getLecturerClasses);
router.post('/assign', assignStudent);
router.delete('/students/:studentId', unassignStudent);  // DELETE method

// Base routes
router.get('/', getClasses);
router.post('/', createClass);

// Param routes LAST
router.get('/:classId/students', getClassStudents);
router.put('/:classId', updateClass);
router.delete('/:classId', deleteClass);
router.get('/:classId', getClassById);

module.exports = router;