const express = require('express');
const router = express.Router();

const {
  getClasses,
  getLecturerClasses,
  createClass,
  deleteClass,
  getClassStudents,
  assignStudent,
  unassignStudent,
  getClassById,
} = require('../controllers/classController');

router.get('/mine',                        getLecturerClasses);
router.get('/',                            getClasses);
router.get('/:classId/students',           getClassStudents);       // supports ?search=
router.post('/',                           createClass);
router.delete('/:classId',                 deleteClass);            // ← new
router.post('/assign',                     assignStudent);
router.delete('/students/:studentId',      unassignStudent);        // ← new
router.get('/:classId',                    getClassById);

module.exports = router;