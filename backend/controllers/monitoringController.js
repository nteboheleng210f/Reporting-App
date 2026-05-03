const { db } = require('../config/firebase');


const getStudentMonitoring = async (req, res) => {
  try {
    const studentId = req.headers['x-user-id'];
    if (!studentId) return res.status(400).json({ success: false, error: 'Student ID required' });

    const userDoc = await db.collection('users').doc(studentId).get();
    if (!userDoc.exists) return res.status(404).json({ success: false, error: 'User not found' });

    const classId = userDoc.data()?.classId;

   
    const attSnap = await db.collection('attendance')
      .where('studentId', '==', studentId)
      .get();

    const attendance = attSnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    let reports = [];
    if (classId) {
     
      const repSnap = await db.collection('lectureReports')
        .where('classId', '==', classId)
        .get();

      reports = repSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    const present = attendance.filter(a => a.status === 'Present').length;
    const total   = attendance.length;
    const attendancePercent = total > 0 ? Math.round((present / total) * 100) : 0;

    res.json({
      success: true,
      attendance,
      reports,
      assigned: !!classId,   
      stats: { present, absent: total - present, total, attendancePercent }
    });
  } catch (error) {
    console.error('getStudentMonitoring error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};


const getLecturerMonitoring = async (req, res) => {
  try {
    const lecturerId = req.headers['x-user-id'];
    if (!lecturerId) return res.status(400).json({ success: false, error: 'Lecturer ID required' });

    const repSnap = await db.collection('lectureReports')
      .where('lecturerId', '==', lecturerId)
      .get();

    const reports = repSnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const courseSnap = await db.collection('courses')
      .where('lecturerId', '==', lecturerId)
      .get();

    const courses = courseSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const totalPresent    = reports.reduce((s, r) => s + (Number(r.actualPresent)   || 0), 0);
    const totalRegistered = reports.reduce((s, r) => s + (Number(r.totalRegistered) || 0), 0);
    const attendancePercent = totalRegistered > 0
      ? Math.round((totalPresent / totalRegistered) * 100) : 0;

    res.json({
      success: true,
      reports,
      courses,
      stats: {
        totalReports: reports.length,
        totalCourses: courses.length,
        totalPresent,
        totalRegistered,
        attendancePercent
      }
    });
  } catch (error) {
    console.error('getLecturerMonitoring error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};


const getPRLMonitoring = async (req, res) => {
  try {
  
    const snap = await db.collection('lectureReports').get();

    const reports = snap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const pending  = reports.filter(r => r.status === 'pending');
    const reviewed = reports.filter(r => r.status === 'reviewed');

    res.json({
      success: true,
      reports, pending, reviewed,
      stats: { total: reports.length, pending: pending.length, reviewed: reviewed.length }
    });
  } catch (error) {
    console.error('getPRLMonitoring error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};


const getPLMonitoring = async (req, res) => {
  try {
    const [repSnap, courseSnap, userSnap] = await Promise.all([
      db.collection('lectureReports').get(),
      db.collection('courses').get(),
      db.collection('users').get(),
    ]);

    const reports = repSnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const courses  = courseSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const users    = userSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const lecturers = users.filter(u => u.role === 'lecturer');
    const students  = users.filter(u => u.role === 'student');

    let totalPresent = 0, totalRegistered = 0;
    reports.forEach(r => {
      totalPresent    += Number(r.actualPresent)   || 0;
      totalRegistered += Number(r.totalRegistered) || 0;
    });

    const attendancePercent = totalRegistered > 0
      ? Math.round((totalPresent / totalRegistered) * 100) : 0;
    const pending  = reports.filter(r => r.status === 'pending').length;
    const reviewed = reports.filter(r => r.status === 'reviewed').length;

    res.json({
      success: true,
      reports: reports.slice(0, 20),
      stats: {
        totalReports:   reports.length,
        pending, reviewed,
        totalCourses:   courses.length,
        totalLecturers: lecturers.length,
        totalStudents:  students.length,
        attendancePercent,
      }
    });
  } catch (error) {
    console.error('getPLMonitoring error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getStudentMonitoring,
  getLecturerMonitoring,
  getPRLMonitoring,
  getPLMonitoring
};