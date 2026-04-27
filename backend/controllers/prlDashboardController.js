const { db } = require('../config/firebase');

const getPRLStats = async (req, res) => {
  try {
    // Get all courses
    const coursesSnap = await db.collection('courses').get();
    const courses = coursesSnap.docs.map(doc => doc.data());
    
    // Get unique lecturers
    const lecturerIds = [...new Set(courses.map(c => c.lecturerId).filter(Boolean))];
    
    // Get reports
    const reportsSnap = await db.collection('lectureReports').get();
    const reports = reportsSnap.docs.map(doc => doc.data());
    const pending = reports.filter(r => r.status === "pending").length;
    const reviewed = reports.filter(r => r.status === "reviewed").length;
    
    res.json({
      success: true,
      stats: {
        courses: courses.length,
        lecturers: lecturerIds.length,
        pendingReports: pending,
        reviewedReports: reviewed,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { getPRLStats };