const { db } = require('../config/firebase');

// Get student's OWN attendance records - FILTERED
const getStudentAttendance = async (req, res) => {
  try {
    const studentId = req.headers['x-user-id'];
    
    console.log("=== getStudentAttendance ===");
    console.log("Student ID from header:", studentId);
    
    if (!studentId) {
      return res.json({ success: true, attendance: [] });
    }

    // ONLY get attendance for this specific student
    const snapshot = await db.collection('attendance')
      .where('studentId', '==', studentId)
      .orderBy('date', 'desc')
      .get();
    
    const attendance = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`Found ${attendance.length} attendance records for student ${studentId}`);
    
    res.json({ success: true, attendance });
  } catch (error) {
    console.error("Attendance error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get students for a course (for lecturer)
const getCourseStudents = async (req, res) => {
  try {
    const { courseId } = req.params;
    
    const snapshot = await db.collection('users')
      .where('role', '==', 'student')
      .get();
    
    const students = snapshot.docs.map(doc => ({
      id: doc.id,
      username: doc.data().username,
      email: doc.data().email,
    }));
    
    res.json({ success: true, students });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Mark attendance (lecturer)
const markAttendance = async (req, res) => {
  try {
    const { attendance, courseId } = req.body;
    
    if (!attendance || !Array.isArray(attendance) || attendance.length === 0) {
      return res.status(400).json({ success: false, error: 'No attendance data provided' });
    }
    
    const batch = db.batch();
    const timestamp = new Date().toISOString();
    const date = timestamp.split('T')[0];
    
    for (const record of attendance) {
      const docRef = db.collection('attendance').doc();
      batch.set(docRef, {
        studentId: record.studentId,
        studentName: record.studentName,
        courseId: record.courseId,
        courseName: record.courseName,
        classId: record.classId || '',
        status: record.status,
        date: date,
        timestamp: timestamp,
        markedBy: 'lecturer'
      });
    }
    
    await batch.commit();
    
    res.json({ 
      success: true, 
      message: `Attendance marked for ${attendance.length} students` 
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { getStudentAttendance, getCourseStudents, markAttendance };