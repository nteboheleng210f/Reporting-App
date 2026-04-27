const { db } = require('../config/firebase');

// Get student dashboard stats
const getStudentStats = async (req, res) => {
  try {
    const studentId = req.headers['x-user-id'];
    
    console.log("Getting stats for student:", studentId);
    
    if (!studentId) {
      return res.status(400).json({ success: false, error: 'Student ID required' });
    }

    // Get user data
    const userDoc = await db.collection('users').doc(studentId).get();
    const userData = userDoc.data();
    const classId = userData?.classId;

    // If student has no class, return empty stats
    if (!classId) {
      console.log("Student has no class assigned - returning empty stats");
      return res.json({
        success: true,
        stats: {
          attendancePercent: 0,
          ratingsCount: 0,
          totalClasses: 0
        },
        user: {
          classId: null,
          className: null
        }
      });
    }

    // Get attendance for this student only
    const attendanceSnap = await db.collection('attendance')
      .where('studentId', '==', studentId)
      .get();
    
    const attendance = attendanceSnap.docs.map(doc => doc.data());
    const present = attendance.filter(a => a.status === 'Present').length;
    const total = attendance.length;
    const attendancePercent = total > 0 ? ((present / total) * 100).toFixed(1) : 0;

    // Get ratings count for this student only
    const ratingsSnap = await db.collection('ratings')
      .where('studentId', '==', studentId)
      .get();
    const ratingsCount = ratingsSnap.size;

    res.json({
      success: true,
      stats: {
        attendancePercent,
        ratingsCount,
        totalClasses: total
      },
      user: {
        classId,
        className: userData?.className || ''
      }
    });
  } catch (error) {
    console.error('Get student stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get upcoming class for student - FIXED
const getUpcomingClass = async (req, res) => {
  try {
    const studentId = req.headers['x-user-id'];
    
    console.log("Getting upcoming class for student:", studentId);
    
    if (!studentId) {
      return res.json({ success: true, upcomingClass: null });
    }

    // Get student's class
    const userDoc = await db.collection('users').doc(studentId).get();
    const studentClassId = userDoc.data()?.classId;

    // If student has no class, return null immediately
    if (!studentClassId) {
      console.log("Student has no class assigned - returning null");
      return res.json({ success: true, upcomingClass: null });
    }

    // Get ONLY the specific class by ID
    const classDoc = await db.collection('classSchedules').doc(studentClassId).get();
    
    if (!classDoc.exists) {
      console.log("Class document not found for ID:", studentClassId);
      return res.json({ success: true, upcomingClass: null });
    }

    console.log("Found class for student:", classDoc.data());
    
    res.json({ success: true, upcomingClass: { id: classDoc.id, ...classDoc.data() } });
  } catch (error) {
    console.error('Get upcoming class error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { getStudentStats, getUpcomingClass };