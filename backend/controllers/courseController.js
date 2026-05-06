const { db } = require('../config/firebase');

// ─── READ: Get all courses ────────────────────────────────────────────────────
const getCourses = async (req, res) => {
  try {
    const snapshot = await db.collection('courses').get();
    const courses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, courses });
  } catch (error) {
    console.error('getCourses error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── READ: Get courses for a specific student (based on their class) ─────────
const getStudentCourses = async (req, res) => {
  try {
    const studentId = req.headers['x-user-id'];

    if (!studentId) return res.json({ success: true, courses: [] });

    const userDoc = await db.collection('users').doc(studentId).get();
    if (!userDoc.exists) return res.json({ success: true, courses: [] });

    const classId = userDoc.data()?.classId;
    if (!classId) return res.json({ success: true, courses: [] });

    const snapshot = await db.collection('courses')
      .where('classId', '==', classId)
      .get();

    const courses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, courses });
  } catch (error) {
    console.error('getStudentCourses error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── READ: Get courses for a specific lecturer ────────────────────────────────
const getLecturerCourses = async (req, res) => {
  try {
    const lecturerId = req.headers['x-user-id'];

    if (!lecturerId) return res.json({ success: true, courses: [] });

    const snap = await db.collection('courses')
      .where('lecturerId', '==', lecturerId)
      .get();

    const courses = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, courses });
  } catch (error) {
    console.error('getLecturerCourses error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── READ: Get single course by ID ────────────────────────────────────────────
const getCourseById = async (req, res) => {
  try {
    const { courseId } = req.params;
    const docSnap = await db.collection('courses').doc(courseId).get();

    if (!docSnap.exists) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    res.json({ success: true, course: { id: docSnap.id, ...docSnap.data() } });
  } catch (error) {
    console.error('getCourseById error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── CREATE: Create a new course ──────────────────────────────────────────────
const createCourse = async (req, res) => {
  try {
    const {
      courseName, courseCode, classId, className,
      venue, day, time, lecturerId, lecturerName
    } = req.body;

    if (!courseName || !courseCode || !classId || !lecturerId) {
      return res.status(400).json({
        success: false,
        error: 'courseName, courseCode, classId, and lecturerId are required'
      });
    }

    const courseData = {
      courseName,
      courseCode,
      classId,
      className:    className    || '',
      venue:        venue        || '',
      day:          day          || '',
      time:         time         || '',
      lecturerId,
      lecturerName: lecturerName || '',
      createdBy:    req.headers['x-user-id'] || '',
      createdAt:    new Date().toISOString(),
      updatedAt:    new Date().toISOString()
    };

    const docRef = await db.collection('courses').add(courseData);

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      course: { id: docRef.id, ...courseData }
    });
  } catch (error) {
    console.error('createCourse error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── UPDATE: Update an existing course ────────────────────────────────────────
const updateCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const {
      courseName, courseCode, classId, className,
      venue, day, time, lecturerId, lecturerName
    } = req.body;

    const courseRef = db.collection('courses').doc(courseId);
    const docSnap = await courseRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    const updateData = {
      ...(courseName !== undefined && { courseName }),
      ...(courseCode !== undefined && { courseCode }),
      ...(classId !== undefined && { classId }),
      ...(className !== undefined && { className }),
      ...(venue !== undefined && { venue }),
      ...(day !== undefined && { day }),
      ...(time !== undefined && { time }),
      ...(lecturerId !== undefined && { lecturerId }),
      ...(lecturerName !== undefined && { lecturerName }),
      updatedAt: new Date().toISOString()
    };

    await courseRef.update(updateData);

    res.json({ success: true, message: 'Course updated successfully', course: { id: courseId, ...updateData } });
  } catch (error) {
    console.error('updateCourse error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── DELETE: Delete a course ──────────────────────────────────────────────────
const deleteCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const courseRef = db.collection('courses').doc(courseId);
    const docSnap = await courseRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    await courseRef.delete();

    res.json({ success: true, message: 'Course deleted successfully' });
  } catch (error) {
    console.error('deleteCourse error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── UPDATE: Reassign lecturer to a course (or remove) ────────────────────────
const updateCourseLecturer = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { lecturerId, lecturerName } = req.body;

    const courseRef = db.collection('courses').doc(courseId);
    const docSnap = await courseRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    await courseRef.update({
      lecturerId: lecturerId || null,
      lecturerName: lecturerName || null,
      updatedAt: new Date().toISOString()
    });

    res.json({ success: true, message: 'Lecturer updated successfully' });
  } catch (error) {
    console.error('updateCourseLecturer error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── READ: Get all classes (for dropdown) ─────────────────────────────────────
const getClasses = async (req, res) => {
  try {
    const snapshot = await db.collection('classSchedules').get();
    const classes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, classes });
  } catch (error) {
    console.error('getClasses error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── READ: Get all lecturers (for dropdown) ───────────────────────────────────
const getLecturers = async (req, res) => {
  try {
    const snapshot = await db.collection('users')
      .where('role', '==', 'lecturer')
      .get();

    const lecturers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, lecturers });
  } catch (error) {
    console.error('getLecturers error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getCourses,
  getStudentCourses,
  getLecturerCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  updateCourseLecturer,
  getClasses,
  getLecturers,
};