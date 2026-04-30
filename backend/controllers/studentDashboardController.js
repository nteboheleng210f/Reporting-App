const { db } = require('../config/firebase');

// Get student dashboard stats
const getStudentStats = async (req, res) => {
  try {
    const studentId = req.headers['x-user-id'];
    
    console.log("=== getStudentStats ===");
    console.log("Student ID from header:", studentId);
    
    if (!studentId) {
      return res.status(400).json({ success: false, error: 'Student ID required' });
    }

    // Get user data
    const userDoc = await db.collection('users').doc(studentId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const userData = userDoc.data();
    const classId = userData?.classId;
    
    console.log("Student's classId:", classId);

    // If student has no class, return zeros
    if (!classId) {
      console.log("No class assigned - returning zeros");
      return res.json({
        success: true,
        stats: {
          attendancePercent: "0",
          ratingsCount: 0,
          totalClasses: 0
        },
        user: {
          classId: null,
          className: null
        }
      });
    }

    // Get attendance for THIS student only - FILTER BY studentId
    const attendanceSnap = await db.collection('attendance')
      .where('studentId', '==', studentId)
      .get();
    
    const attendance = attendanceSnap.docs.map(doc => doc.data());
    const present = attendance.filter(a => a.status === 'Present').length;
    const total = attendance.length;
    const attendancePercent = total > 0 ? ((present / total) * 100).toFixed(1) : "0";

    // Get ratings for THIS student only - FILTER BY studentId
    const ratingsSnap = await db.collection('ratings')
      .where('studentId', '==', studentId)
      .get();
    const ratingsCount = ratingsSnap.size;

    console.log(`Found ${total} attendance records, ${ratingsCount} ratings`);

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

// Get upcoming class for student - ONLY THEIR OWN CLASS
const getUpcomingClass = async (req, res) => {
  try {
    const studentId = req.headers['x-user-id'];
    
    console.log("=== getUpcomingClass ===");
    console.log("Student ID from header:", studentId);
    
    if (!studentId) {
      return res.json({ success: true, upcomingClass: null });
    }

    // Get student's class ID from their OWN user document
    const userDoc = await db.collection('users').doc(studentId).get();
    
    if (!userDoc.exists) {
      return res.json({ success: true, upcomingClass: null });
    }
    
    const studentClassId = userDoc.data()?.classId;
    
    console.log("Student's assigned classId:", studentClassId);

    // If student has no class assigned, return null
    if (!studentClassId) {
      console.log("No class assigned - returning null");
      return res.json({ success: true, upcomingClass: null });
    }

    // Get ONLY the class that matches the student's classId
    const classDoc = await db.collection('classSchedules').doc(studentClassId).get();
    
    if (!classDoc.exists) {
      console.log("Class document not found for ID:", studentClassId);
      return res.json({ success: true, upcomingClass: null });
    }

    const classData = { id: classDoc.id, ...classDoc.data() };
    console.log("Found class for student:", classData.className);
    
    res.json({ success: true, upcomingClass: classData });
  } catch (error) {
    console.error('Get upcoming class error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { getStudentStats, getUpcomingClass };