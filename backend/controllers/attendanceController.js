const { db } = require('../config/firebase');


const getStudentAttendance = async (req, res) => {
  try {
    const studentId = req.headers['x-user-id'];

    if (!studentId) {
      return res.json({ success: true, attendance: [] });
    }

    const snapshot = await db.collection('attendance')
      .where('studentId', '==', studentId)
      .get();

    const attendance = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ success: true, attendance });
  } catch (error) {
    console.error('getStudentAttendance error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};


const getCourseStudents = async (req, res) => {
  try {
    const { courseId } = req.params;

    
    const courseDoc = await db.collection('courses').doc(courseId).get();
    if (!courseDoc.exists) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    const classId = courseDoc.data()?.classId;
    if (!classId) {
      return res.json({ success: true, students: [] });
    }

    //
    const snapshot = await db.collection('users')
      .where('role', '==', 'student')
      .where('classId', '==', classId)
      .get();

    const students = snapshot.docs.map(doc => ({
      id: doc.id,
      username: doc.data().username,
      email:    doc.data().email,
    }));

    res.json({ success: true, students });
  } catch (error) {
    console.error('getCourseStudents error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};


const markAttendance = async (req, res) => {
  try {
    const { attendance, courseId } = req.body;
    const lecturerId = req.headers['x-user-id'];

    if (!attendance || !Array.isArray(attendance) || attendance.length === 0) {
      return res.status(400).json({ success: false, error: 'No attendance data provided' });
    }

    const batch     = db.batch();
    const timestamp = new Date().toISOString();
    const date      = timestamp.split('T')[0];

    for (const record of attendance) {
      const docRef = db.collection('attendance').doc();
      batch.set(docRef, {
        studentId:   record.studentId,
        studentName: record.studentName,
        courseId:    record.courseId,
        courseName:  record.courseName,
        classId:     record.classId || '',
        status:      record.status,
        date,
        timestamp,
        markedBy:    lecturerId || 'lecturer', 
      });
    }

    await batch.commit();

    res.json({
      success: true,
      message: `Attendance marked for ${attendance.length} students`
    });
  } catch (error) {
    console.error('markAttendance error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { getStudentAttendance, getCourseStudents, markAttendance };