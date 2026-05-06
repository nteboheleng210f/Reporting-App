const express = require('express');
const router = express.Router();

const {
  getClasses,
  getLecturerClasses,
  createClass,
  updateClass,      // ← new
  deleteClass,      // ← new
  getClassStudents,
  assignStudent,
  unassignStudent,  // ← new
  getClassById,
} = require('../controllers/classController');

router.get('/mine',                        getLecturerClasses);
router.get('/',                            getClasses);
router.get('/:classId/students',           getClassStudents);
router.post('/',                           createClass);
router.put('/:classId',                    updateClass);       // ← new
router.delete('/:classId',                 deleteClass);       // ← new
router.post('/assign',                     assignStudent);
router.delete('/students/:studentId',      unassignStudent);   // ← new
router.get('/:classId',                    getClassById);

module.exports = router;