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

    if (coursesSnap.empty) return res.json({ success: true, classes: [] });

    const classIds = [
      ...new Set(coursesSnap.docs.map(doc => doc.data().classId).filter(Boolean))
    ];

    if (classIds.length === 0) return res.json({ success: true, classes: [] });

    const classDocs = await Promise.all(
      classIds.map(id => db.collection('classSchedules').doc(id).get())
    );

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
    const { className, facultyName, semester } = req.body;

    if (!className || !facultyName || !semester) {
      return res.status(400).json({
        success: false,
        error: 'Class Name, Faculty, and Semester are required'
      });
    }

    const classData = {
      className,
      facultyName,
      semester,
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


const updateClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const { className, facultyName, semester } = req.body;

    if (!className || !facultyName || !semester) {
      return res.status(400).json({
        success: false,
        error: 'Class Name, Faculty, and Semester are required'
      });
    }

    const classRef = db.collection('classSchedules').doc(classId);
    const docSnap  = await classRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ success: false, error: 'Class not found' });
    }

    await classRef.update({
      className,
      facultyName,
      semester,
      updatedAt: new Date().toISOString(),
    });

    res.json({ success: true, message: 'Class updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};


// ── DELETE CLASS — cascades: unassigns all students, unlinks all courses ───────
const deleteClass = async (req, res) => {
  try {
    const { classId } = req.params;

    const classRef = db.collection('classSchedules').doc(classId);
    const docSnap  = await classRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ success: false, error: 'Class not found' });
    }

    // 1. Unassign all students in this class
    const studentsSnap = await db.collection('users')
      .where('role',    '==', 'student')
      .where('classId', '==', classId)
      .get();

    const studentUpdates = studentsSnap.docs.map(doc =>
      doc.ref.update({ classId: null, updatedAt: new Date().toISOString() })
    );

    // 2. Unlink all courses tied to this class (clear classId + className)
    const coursesSnap = await db.collection('courses')
      .where('classId', '==', classId)
      .get();

    const courseUpdates = coursesSnap.docs.map(doc =>
      doc.ref.update({
        classId:   '',
        className: '',
        updatedAt: new Date().toISOString(),
      })
    );

    // 3. Run all updates in parallel then delete the class
    await Promise.all([...studentUpdates, ...courseUpdates]);
    await classRef.delete();

    res.json({
      success: true,
      message: `Class deleted. ${studentsSnap.size} student(s) unassigned, ${coursesSnap.size} course(s) unlinked.`,
    });
  } catch (error) {
    console.error('deleteClass error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};


// Returns ALL students with their assigned status for the given class
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


// ── UNASSIGN STUDENT — clears their classId ────────────────────────────────────
const unassignStudent = async (req, res) => {
  try {
    const { studentId } = req.params;

    const userRef = db.collection('users').doc(studentId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    await userRef.update({
      classId:   null,
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
    const { classId }    = req.params;
    const studentId      = req.headers['x-user-id'];
    const userDoc        = await db.collection('users').doc(studentId).get();
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
  updateClass,
  deleteClass,
  getClassStudents,
  assignStudent,
  unassignStudent,
  getClassById,
};