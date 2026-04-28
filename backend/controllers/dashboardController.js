const { db } = require('../config/firebase');

const getLecturerStats = async (req, res) => {
  try {
    const lecturerId = req.headers['x-user-id'];

    if (!lecturerId) {
      return res.status(400).json({ success: false, error: 'Lecturer ID required' });
    }

    // Get lecturer's user doc to confirm they exist & check assignment
    const userDoc = await db.collection('users').doc(lecturerId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const userData = userDoc.data();

    // ✅ Only count courses assigned to THIS lecturer
    const coursesSnap = await db.collection('courses')
      .where('lecturerId', '==', lecturerId)
      .get();
    const coursesCount = coursesSnap.size;

    // ✅ Collect unique classIds from lecturer's courses
    const classIds = new Set(
      coursesSnap.docs.map(doc => doc.data().classId).filter(Boolean)
    );

    // ✅ Only count reports submitted by THIS lecturer
    const reportsSnap = await db.collection('lectureReports')
      .where('lecturerId', '==', lecturerId)
      .get();
    const reportsCount = reportsSnap.size;

    res.json({
      success: true,
      stats: {
        courses: coursesCount,
        classes: classIds.size,
        reports: reportsCount,
      },
      user: {
        lecturerName: userData?.username || userData?.email || '',
        isAssigned: coursesCount > 0,
      }
    });
  } catch (error) {
    console.error('getLecturerStats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { getLecturerStats };