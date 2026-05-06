const { db } = require('../config/firebase');


const getClasses = async (req, res) => {
  try {
    const snapshot = await db.collection('classSchedules').get();
    const classes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, classes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};


const getLecturerClasses = async (req, res) => {
  try {
    const lecturerId = req.headers['x-user-id'];

    if (!lecturerId) {
      return res.status(400).json({ success: false, error: 'Lecturer ID required' });
    }

    const coursesSnap = await db.collection('courses')
      .where('lecturerId', '==', lecturerId)
      .get();

    if (coursesSnap.empty) {
      return res.json({ success: true, classes: [] });
    }

    const classIds = [
      ...new Set(
        coursesSnap.docs
          .map(doc => doc.data().classId)
          .filter(Boolean)
      )
    ];

    if (classIds.length === 0) {
      return res.json({ success: true, classes: [] });
    }

    const classPromises = classIds.map(id =>
      db.collection('classSchedules').doc(id).get()
    );
    const classDocs = await Promise.all(classPromises);

    const classes = classDocs
      .filter(doc => doc.exists)
      .map(doc => ({ id: doc.id, ...doc.data() }));

    res.json({ success: true, classes });
  } catch (error) {
    console.error('getLecturerClasses error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};


const createClass = async (req, res) => {
  try {
    const { className, facultyName, venue, day, time } = req.body;

    if (!className || !facultyName || !venue || !day || !time) {
      return res.status(400).json({ success: false, error: 'All fields required' });
    }

    const classData = {
      className,
      facultyName,
      venue,
      day,
      time,
      createdAt: new Date().toISOString(),
      createdBy: req.headers['x-user-id'] || 'admin',
    };

    const docRef = await db.collection('classSchedules').add(classData);

    res.status(201).json({
      success: true,
      message: 'Class created successfully',
      class: { id: docRef.id, ...classData },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};


// ── NEW: Delete a class ───────────────────────────────────────────────────────
// Blocks deletion if students are still assigned to this class
const deleteClass = async (req, res) => {
  try {
    const { classId } = req.params;

    // Guard: check for assigned students
    const assignedSnap = await db.collection('users')
      .where('role',    '==', 'student')
      .where('classId', '==', classId)
      .get();

    if (!assignedSnap.empty) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete: ${assignedSnap.size} student(s) are still assigned to this class. Unassign them first.`,
      });
    }

    // Guard: check for courses linked to this class
    const coursesSnap = await db.collection('courses')
      .where('classId', '==', classId)
      .get();

    if (!coursesSnap.empty) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete: ${coursesSnap.size} course(s) are still linked to this class. Remove or reassign those courses first.`,
      });
    }

    const docSnap = await db.collection('classSchedules').doc(classId).get();
    if (!docSnap.exists) {
      return res.status(404).json({ success: false, error: 'Class not found' });
    }

    await db.collection('classSchedules').doc(classId).delete();
    res.json({ success: true, message: 'Class deleted successfully' });
  } catch (error) {
    console.error('deleteClass error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};


// Returns all students with their assigned status for a given class.
// Supports ?search=<term>  (filters by name or email, case-insensitive)
const getClassStudents = async (req, res) => {
  try {
    const { classId } = req.params;

    const studentsSnap = await db.collection('users')
      .where('role', '==', 'student')
      .get();

    let students = studentsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      assigned: doc.data().classId === classId,
    }));

    // Optional search filter (applied server-side)
    if (req.query.search) {
      const term = req.query.search.toLowerCase();
      students = students.filter(s =>
        (s.username || '').toLowerCase().includes(term) ||
        (s.email    || '').toLowerCase().includes(term)
      );
    }

    res.json({ success: true, students });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};


const assignStudent = async (req, res) => {
  try {
    const { studentId, classId } = req.body;

    if (!studentId || !classId) {
      return res.status(400).json({ success: false, error: 'Student ID and Class ID required' });
    }

    await db.collection('users').doc(studentId).update({
      classId,
      updatedAt: new Date().toISOString(),
    });

    res.json({ success: true, message: 'Student assigned successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};


// ── NEW: Unassign a student from their class ──────────────────────────────────
const unassignStudent = async (req, res) => {
  try {
    const { studentId } = req.params;

    const userDoc = await db.collection('users').doc(studentId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    if (!userDoc.data().classId) {
      return res.status(400).json({ success: false, error: 'Student is not assigned to any class' });
    }

    // Use FieldValue.delete() to fully remove the classId field
    const { FieldValue } = require('firebase-admin/firestore');
    await db.collection('users').doc(studentId).update({
      classId:   FieldValue.delete(),
      updatedAt: new Date().toISOString(),
    });

    res.json({ success: true, message: 'Student unassigned successfully' });
  } catch (error) {
    console.error('unassignStudent error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};


const getClassById = async (req, res) => {
  try {
    const { classId } = req.params;
    const studentId = req.headers['x-user-id'];

    const userDoc = await db.collection('users').doc(studentId).get();
    const studentClassId = userDoc.data()?.classId;

    if (!studentClassId || studentClassId !== classId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const docSnap = await db.collection('classSchedules').doc(classId).get();

    if (!docSnap.exists) {
      return res.status(404).json({ success: false, error: 'Class not found' });
    }

    res.json({ success: true, class: { id: docSnap.id, ...docSnap.data() } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};


module.exports = {
  getClasses,
  getLecturerClasses,
  createClass,
  deleteClass,       // ← new
  getClassStudents,
  assignStudent,
  unassignStudent,   // ← new
  getClassById,
};