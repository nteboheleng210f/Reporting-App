const { db } = require('../config/firebase');

const DAY_ORDER = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

const getStudentStats = async (req, res) => {
  try {
    const studentId = req.headers['x-user-id'];
    if (!studentId) return res.status(400).json({ success: false, error: 'Student ID required' });

    const userDoc = await db.collection('users').doc(studentId).get();
    if (!userDoc.exists) return res.status(404).json({ success: false, error: 'User not found' });

    const userData = userDoc.data();
    const classId  = userData?.classId;

    if (!classId) {
      return res.json({
        success: true,
        stats: { attendancePercent: "0", ratingsCount: 0, totalClasses: 0 },
        user:  { classId: null, className: null }
      });
    }

    const attendanceSnap = await db.collection('attendance')
      .where('studentId', '==', studentId).get();
    const attendance = attendanceSnap.docs.map(doc => doc.data());
    const present    = attendance.filter(a => a.status === 'Present').length;
    const total      = attendance.length;
    const attendancePercent = total > 0 ? ((present / total) * 100).toFixed(1) : "0";

    const ratingsSnap = await db.collection('ratings')
      .where('studentId', '==', studentId).get();

    res.json({
      success: true,
      stats: { attendancePercent, ratingsCount: ratingsSnap.size, totalClasses: total },
      user:  { classId, className: userData?.className || '' }
    });
  } catch (error) {
    console.error('getStudentStats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ DAY_ORDER defined at top — was missing before
const getTimetable = async (req, res) => {
  try {
    const studentId = req.headers['x-user-id'];
    if (!studentId) return res.json({ success: true, timetable: [] });

    const userDoc = await db.collection('users').doc(studentId).get();
    if (!userDoc.exists) return res.json({ success: true, timetable: [] });

    const classId = userDoc.data()?.classId;
    if (!classId)  return res.json({ success: true, timetable: [] });

    const coursesSnap = await db.collection('courses')
      .where('classId', '==', classId)
      .get();

    const timetable = coursesSnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      // ✅ Show all courses even without a day set
      .sort((a, b) => {
        const ai = DAY_ORDER.indexOf(a.day);
        const bi = DAY_ORDER.indexOf(b.day);
        if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        return (a.time || "").localeCompare(b.time || "");
      });

    res.json({ success: true, timetable });
  } catch (error) {
    console.error('getTimetable error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { getStudentStats, getTimetable };