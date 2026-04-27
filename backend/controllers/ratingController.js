const { db } = require('../config/firebase');

const submitRating = async (req, res) => {
  try {
    const {
      lecturerId,
      lecturerName,
      courseName,
      courseCode,
      classId,
      className,
      rating,
      comment
    } = req.body;

    if (!lecturerId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: 'Lecturer ID and valid rating (1-5) required' });
    }

    const ratingData = {
      studentId: "test_student",
      studentName: "Test Student",
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

const getAllRatings = async (req, res) => {
  try {
    const snapshot = await db.collection('ratings').orderBy('createdAt', 'desc').get();
    const ratings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, ratings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getStudentCourses = async (req, res) => {
  try {
    const snapshot = await db.collection('courses').get();
    const courses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, courses });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getLecturerRatings = async (req, res) => {
  try {
    const { lecturerId } = req.params;
    const snapshot = await db.collection('ratings').where('lecturerId', '==', lecturerId).get();
    const ratings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, ratings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const hasRated = async (req, res) => {
  res.json({ success: true, hasRated: false });
};

module.exports = { submitRating, getAllRatings, getStudentCourses, getLecturerRatings, hasRated };