const { db } = require('../config/firebase');

const submitRating = async (req, res) => {
  try {
    const {
      lecturerId, lecturerName, courseName,
      courseCode, classId, className, rating, comment
    } = req.body;

    const studentId = req.headers['x-user-id'];

    if (!lecturerId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Lecturer ID and valid rating (1–5) required'
      });
    }

    // Get student name and class info
    let studentName = 'Student';
    let verifiedClassId = classId || '';
    let verifiedClassName = className || '';
    
    if (studentId) {
      const userDoc = await db.collection('users').doc(studentId).get();
      if (userDoc.exists) {
        const data = userDoc.data();
        studentName = data?.username || data?.email || 'Student';
        verifiedClassId = data?.classId || '';
        verifiedClassName = data?.className || '';
      }
    }

    // FIX: Verify the course exists and get the CORRECT lecturer ID
    let finalLecturerId = lecturerId;
    let finalLecturerName = lecturerName;
    
    if (verifiedClassId && courseName) {
      const courseSnap = await db.collection('courses')
        .where('classId', '==', verifiedClassId)
        .where('courseName', '==', courseName)
        .limit(1)
        .get();

      if (!courseSnap.empty) {
        const courseData = courseSnap.docs[0].data();
        // Use the lecturer ID from the course document
        finalLecturerId = courseData.lecturerId;
        finalLecturerName = courseData.lecturerName || lecturerName;
      } else {
        return res.status(403).json({
          success: false,
          error: 'Course not found for your class'
        });
      }
    }

    const ratingData = {
      studentId: studentId || 'unknown',
      studentName,
      lecturerId: finalLecturerId,  // FIXED: Correct lecturer ID
      lecturerName: finalLecturerName,
      courseName: courseName || '',
      courseCode: courseCode || '',
      classId: verifiedClassId,
      className: verifiedClassName,
      rating: Number(rating),
      comment: comment?.trim() || '',
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection('ratings').add(ratingData);

    res.status(201).json({
      success: true,
      message: 'Rating submitted successfully',
      ratingId: docRef.id
    });
  } catch (error) {
    console.error('submitRating error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getAllRatings = async (req, res) => {
  try {
    const snapshot = await db.collection('ratings')
      .orderBy('createdAt', 'desc')
      .get();

    const ratings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, ratings });
  } catch (error) {
    console.error('getAllRatings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

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
    console.error('getMyRatings error:', error);
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

// FIXED: This ensures lecturers see ratings from students
const getLecturerRatings = async (req, res) => {
  try {
    const lecturerId = req.headers['x-user-id'];
    console.log("Lecturer ID from header:", lecturerId); // Debug log
    
    if (!lecturerId) {
      return res.json({ success: true, ratings: [] });
    }

    const snapshot = await db.collection('ratings')
      .where('lecturerId', '==', lecturerId)
      .orderBy('createdAt', 'desc')
      .get();

    const ratings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`Found ${ratings.length} ratings for lecturer ${lecturerId}`); // Debug log
    
    res.json({ success: true, ratings });
  } catch (error) {
    console.error('getLecturerRatings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const hasRated = async (req, res) => {
  res.json({ success: true, hasRated: false });
};

// Debug endpoint to check all ratings in database
const debugAllRatings = async (req, res) => {
  try {
    const snapshot = await db.collection('ratings').get();
    const ratings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log("ALL RATINGS IN DATABASE:", JSON.stringify(ratings, null, 2));
    res.json({ success: true, ratings, count: ratings.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  submitRating,
  getAllRatings,
  getMyRatings,
  getStudentCourses,
  getLecturerRatings,
  hasRated,
  debugAllRatings,
};