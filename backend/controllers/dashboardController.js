const { db } = require('../config/firebase');

const getLecturerStats = async (req, res) => {
  try {
    // Get courses count
    const coursesSnap = await db.collection('courses').get();
    const coursesCount = coursesSnap.size;

    // Get reports count
    const reportsSnap = await db.collection('lectureReports').get();
    const reportsCount = reportsSnap.size;

    res.json({
      success: true,
      stats: {
        courses: coursesCount,
        classes: coursesCount,
        reports: reportsCount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { getLecturerStats };