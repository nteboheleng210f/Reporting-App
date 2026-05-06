const express = require('express');
const router  = express.Router();

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

// ── Specific routes first (before /:classId to avoid conflicts) ───────────────
router.get('/mine',              getLecturerClasses); // lecturer only
router.post('/assign',           assignStudent);      // assign student to class

// ✅ Unassign student — DELETE /classes/students/:studentId
router.delete('/students/:studentId', unassignStudent);

// ── Class CRUD ────────────────────────────────────────────────────────────────
router.get('/',                  getClasses);         // PL — all classes
router.post('/',                 createClass);        // PL — create class

// ✅ Edit class — PUT /classes/:classId
router.put('/:classId',          updateClass);

// ✅ Delete class — DELETE /classes/:classId
router.delete('/:classId',       deleteClass);

// ── Other ─────────────────────────────────────────────────────────────────────
router.get('/:classId/students', getClassStudents);   // PL — students for a class
router.get('/:classId',          getClassById);       // student — own class only

module.exports = router;