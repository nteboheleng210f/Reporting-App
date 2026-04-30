const { db } = require('../config/firebase');


const getPLStats = async (req, res) => {
  try {
   
    const coursesSnap = await db.collection('courses').get();
    const coursesCount = coursesSnap.size;

  
    const classesSnap = await db.collection('classSchedules').get();
    const classesCount = classesSnap.size;

   
    const reportsSnap = await db.collection('lectureReports').get();
    const reportsCount = reportsSnap.size;

   
    const lecturersSnap = await db.collection('users')
      .where('role', '==', 'lecturer')
      .get();
    const lecturersCount = lecturersSnap.size;

   
    const studentsSnap = await db.collection('users')
      .where('role', '==', 'student')
      .get();
    const studentsCount = studentsSnap.size;

    // Get pending reports
    const pendingSnap = await db.collection('lectureReports')
      .where('status', '==', 'pending')
      .get();
    const pendingCount = pendingSnap.size;

    // Get reviewed reports
    const reviewedSnap = await db.collection('lectureReports')
      .where('status', '==', 'reviewed')
      .get();
    const reviewedCount = reviewedSnap.size;

    res.json({
      success: true,
      stats: {
        courses: coursesCount,
        classes: classesCount,
        reports: reportsCount,
        lecturers: lecturersCount,
        students: studentsCount,
        pendingReports: pendingCount,
        reviewedReports: reviewedCount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get recent activity
const getRecentActivity = async (req, res) => {
  try {
    // Get recent reports
    const reportsSnap = await db.collection('lectureReports')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();
    
    const recentReports = reportsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      type: 'report'
    }));

    // Get recent ratings
    const ratingsSnap = await db.collection('ratings')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();
    
    const recentRatings = ratingsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      type: 'rating'
    }));

    // Combine and sort
    const activities = [...recentReports, ...recentRatings]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);

    res.json({ success: true, activities });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { getPLStats, getRecentActivity };