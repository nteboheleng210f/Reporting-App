const { db } = require('../config/firebase');

// ─── Submit rating (student) ──────────────────────────────────────────────────
const submitRating = async (req, res) => {
  try {
    const {
      lecturerId, lecturerName, courseName,
      courseCode, classId, className, rating, comment
    } = req.body;

    const studentId = req.headers['x-user-id'];

    if (!lecturerId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: 'Lecturer ID and valid rating (1-5) required' });
    }

    // Get student name from Firestore
    let studentName = "Student";
    if (studentId) {
      const userDoc = await db.collection('users').doc(studentId).get();
      if (userDoc.exists) {
        studentName = userDoc.data()?.username || userDoc.data()?.email || "Student";
      }
    }

    const ratingData = {
      studentId: studentId || "unknown",
      studentName,
      lecturerId,
      lecturerName: lecturerName || '',
      courseName: courseName || '',
      courseCode: courseCode || '',
      classId: classId || '',
      className: className || '',
      rating: Number(rating),
      comment: comment || '',
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection('ratings').add(ratingData);

    res.status(201).json({
      success: true,
      message: 'Rating submitted successfully',
      ratingId: docRef.id
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── Get ALL ratings (PRL/PL only) ───────────────────────────────────────────
const getAllRatings = async (req, res) => {
  try {
    const snapshot = await db.collection('ratings').orderBy('createdAt', 'desc').get();
    const ratings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, ratings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── Get student's OWN ratings only ──────────────────────────────────────────
const getMyRatings = async (req, res) => {
  try {
    const studentId = req.headers['x-user-id'];
    if (!studentId) return res.json({ success: true, ratings: [] });

    const snapshot = await db.collection('ratings')
      .where('studentId', '==', studentId)
      .orderBy('createdAt', 'desc')
      .get();

    const ratings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, ratings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── Get courses for THIS student only (filtered by their classId) ────────────
const getStudentCourses = async (req, res) => {
  try {
    const studentId = req.headers['x-user-id'];

    if (!studentId) {
      return res.json({ success: true, courses: [] });
    }

    // Read student's classId from Firestore — never trust the request body
    const userDoc = await db.collection('users').doc(studentId).get();
    if (!userDoc.exists) {
      return res.json({ success: true, courses: [] });
    }

    const classId = userDoc.data()?.classId;

    // Student not assigned yet — return empty, not all courses
    if (!classId) {
      return res.json({ success: true, courses: [] });
    }

    // Only return courses that belong to the student's class
    const snapshot = await db.collection('courses')
      .where('classId', '==', classId)
      .get();

    const courses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, courses });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── Get ratings for THIS lecturer only ──────────────────────────────────────
const getLecturerRatings = async (req, res) => {
  try {
    const lecturerId = req.headers['x-user-id'];
    if (!lecturerId) return res.json({ success: true, ratings: [] });

    const snapshot = await db.collection('ratings')
      .where('lecturerId', '==', lecturerId)
      .orderBy('createdAt', 'desc')
      .get();

    const ratings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, ratings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const hasRated = async (req, res) => {
  res.json({ success: true, hasRated: false });
};

module.exports = {
  submitRating,
  getAllRatings,
  getMyRatings,
  getStudentCourses,
  getLecturerRatings,
  hasRated
};