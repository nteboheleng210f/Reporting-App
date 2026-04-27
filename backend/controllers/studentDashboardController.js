const { db } = require('../config/firebase');

// Get student dashboard stats
const getStudentStats = async (req, res) => {
  try {
    // Get student ID from header instead of req.user
    const studentId = req.headers['x-user-id'];
    
    if (!studentId) {
      return res.status(400).json({ success: false, error: 'Student ID required' });
    }

    // Get user data
    const userDoc = await db.collection('users').doc(studentId).get();
    const userData = userDoc.data();
    const classId = userData?.classId;
    const className = userData?.className;

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
        className
      }
    });
  } catch (error) {
    console.error('Get student stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get upcoming class for student
const getUpcomingClass = async (req, res) => {
  try {
    // Get student ID from header
    const studentId = req.headers['x-user-id'];
    
    if (!studentId) {
      return res.json({ success: true, upcomingClass: null });
    }

    // Get student's class
    const userDoc = await db.collection('users').doc(studentId).get();
    const studentClass = userDoc.data()?.classId || userDoc.data()?.className;

    if (!studentClass) {
      return res.json({ success: true, upcomingClass: null });
    }

    // Get all class schedules
    const snapshot = await db.collection('classSchedules').get();
    const allClasses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Filter student's classes
    const myClasses = allClasses.filter(c => 
      c.classId === studentClass || c.className === studentClass
    );

    if (myClasses.length === 0) {
      return res.json({ success: true, upcomingClass: null });
    }

    // Day order mapping
    const dayOrder = {
      'MONDAY': 1, 'TUESDAY': 2, 'WEDNESDAY': 3,
      'THURSDAY': 4, 'FRIDAY': 5, 'SATURDAY': 6, 'SUNDAY': 7
    };

    const today = new Date();
    const currentDayIndex = today.getDay();
    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const currentDay = dayNames[currentDayIndex];

    const getStartTime = (timeStr) => {
      if (!timeStr) return '00:00';
      return timeStr.split('-')[0].trim();
    };

    const sorted = myClasses.sort((a, b) => {
      const dayDiff = (dayOrder[a.day?.toUpperCase()] || 99) - (dayOrder[b.day?.toUpperCase()] || 99);
      if (dayDiff !== 0) return dayDiff;
      return getStartTime(a.time).localeCompare(getStartTime(b.time));
    });

    const currentTime = today.toTimeString().slice(0, 5);
    let nextClass = sorted.find(c => {
      const classDay = c.day?.toUpperCase();
      if (dayOrder[classDay] > dayOrder[currentDay]) return true;
      if (classDay === currentDay && getStartTime(c.time) >= currentTime) return true;
      return false;
    });

    if (!nextClass) {
      nextClass = sorted.find(c => dayOrder[c.day?.toUpperCase()] > dayOrder[currentDay]);
    }

    if (!nextClass && sorted.length > 0) {
      nextClass = sorted[0];
    }

    res.json({ success: true, upcomingClass: nextClass || null });
  } catch (error) {
    console.error('Get upcoming class error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { getStudentStats, getUpcomingClass };