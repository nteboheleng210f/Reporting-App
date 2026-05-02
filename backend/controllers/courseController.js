const { db } = require('../config/firebase');


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
      createdAt:    new Date().toISOString()
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
  getClasses,
  getLecturers,
};