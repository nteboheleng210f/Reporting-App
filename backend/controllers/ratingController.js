const { db } = require('../config/firebase');

// Submit rating (student)
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

    const studentId = req.headers['x-user-id'];

    if (!lecturerId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: 'Lecturer ID and valid rating (1-5) required' });
    }

    const ratingData = {
      studentId: studentId || "unknown",
      studentName: req.body.studentName || "Student",
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

// Get ALL ratings (for PRL/PL only)
const getAllRatings = async (req, res) => {
  try {
    const snapshot = await db.collection('ratings').orderBy('createdAt', 'desc').get();
    const ratings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, ratings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get student's OWN ratings - FILTERED
const getMyRatings = async (req, res) => {
  try {
    const studentId = req.headers['x-user-id'];
    
    console.log("=== getMyRatings ===");
    console.log("Student ID from header:", studentId);
    
    if (!studentId) {
      return res.json({ success: true, ratings: [] });
    }
    
    // ONLY get ratings for this specific student
    const snapshot = await db.collection('ratings')
      .where('studentId', '==', studentId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const ratings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    console.log(`Found ${ratings.length} ratings for student ${studentId}`);
    
    res.json({ success: true, ratings });
  } catch (error) {
    console.error("Ratings error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get courses for student
const getStudentCourses = async (req, res) => {
  try {
    const snapshot = await db.collection('courses').get();
    const courses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, courses });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get ratings for a specific lecturer
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

module.exports = { 
  submitRating, 
  getAllRatings, 
  getMyRatings,  
  getStudentCourses, 
  getLecturerRatings, 
  hasRated 
};