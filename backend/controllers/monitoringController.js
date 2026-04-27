const { db } = require('../config/firebase');

// Get monitoring data based on user role
const getMonitoringData = async (req, res) => {
  try {
    // For testing without auth, use a default role
    // In production, get role from req.userRole
    const role = req.query.role || 'student';
    
    let data = {};

    if (role === 'student') {
      // Student: get their attendance records
      const attendanceSnap = await db.collection('attendance')
        .orderBy('date', 'desc')
        .get();
      
      const attendance = attendanceSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Get reports for their class
      const reportsSnap = await db.collection('lectureReports')
        .orderBy('createdAt', 'desc')
        .get();
      
      const reports = reportsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      data = { attendance, reports };
      
    } else if (role === 'lecturer') {
      // Lecturer: get their own reports
      const reportsSnap = await db.collection('lectureReports')
        .orderBy('createdAt', 'desc')
        .get();
      
      const reports = reportsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Get their courses
      const coursesSnap = await db.collection('courses').get();
      const courses = coursesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Calculate stats
      const totalPresent = reports.reduce((sum, r) => sum + (Number(r.actualPresent) || 0), 0);
      const totalRegistered = reports.reduce((sum, r) => sum + (Number(r.totalRegistered) || 0), 0);
      
      data = { 
        reports, 
        courses,
        stats: { totalPresent, totalRegistered }
      };
      
    } else if (role === 'prl') {
      // PRL: get all reports for review
      const reportsSnap = await db.collection('lectureReports')
        .orderBy('createdAt', 'desc')
        .get();
      
      const reports = reportsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const pending = reports.filter(r => r.status === 'pending');
      const reviewed = reports.filter(r => r.status === 'reviewed');
      
      data = { reports, pending, reviewed };
      
    } else if (role === 'pl') {
      // PL: get complete system overview
      const reportsSnap = await db.collection('lectureReports')
        .orderBy('createdAt', 'desc')
        .get();
      
      const reports = reportsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const coursesSnap = await db.collection('courses').get();
      const courses = coursesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const usersSnap = await db.collection('users').get();
      const users = usersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const lecturers = users.filter(u => u.role === 'lecturer');
      const students = users.filter(u => u.role === 'student');
      
      // Calculate overall attendance
      let totalPresent = 0;
      let totalRegistered = 0;
      reports.forEach(r => {
        totalPresent += Number(r.actualPresent) || 0;
        totalRegistered += Number(r.totalRegistered) || 0;
      });
      const attendancePercentage = totalRegistered > 0 
        ? Math.round((totalPresent / totalRegistered) * 100) 
        : 0;
      
      data = { 
        reports, 
        courses,
        users: { lecturers, students },
        stats: { attendancePercentage, totalPresent, totalRegistered }
      };
    }

    res.json({ success: true, data, role });
    
  } catch (error) {
    console.error("Monitoring error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get student attendance only
const getStudentAttendanceMonitoring = async (req, res) => {
  try {
    const snapshot = await db.collection('attendance')
      .orderBy('date', 'desc')
      .get();
    
    const attendance = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({ success: true, attendance });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get lecturer reports only
const getLecturerReports = async (req, res) => {
  try {
    const snapshot = await db.collection('lectureReports')
      .orderBy('createdAt', 'desc')
      .get();
    
    const reports = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({ success: true, reports });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get PRL review data
const getPRLReviewData = async (req, res) => {
  try {
    const snapshot = await db.collection('lectureReports')
      .orderBy('createdAt', 'desc')
      .get();
    
    const reports = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    const pending = reports.filter(r => r.status === 'pending');
    const reviewed = reports.filter(r => r.status === 'reviewed');
    
    res.json({ 
      success: true, 
      reports,
      pending,
      reviewed,
      stats: {
        total: reports.length,
        pending: pending.length,
        reviewed: reviewed.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get PL system overview
const getPLOverview = async (req, res) => {
  try {
    const reportsSnap = await db.collection('lectureReports').get();
    const reports = reportsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    const coursesSnap = await db.collection('courses').get();
    const courses = coursesSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    const usersSnap = await db.collection('users').get();
    const users = usersSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    const lecturers = users.filter(u => u.role === 'lecturer');
    const students = users.filter(u => u.role === 'student');
    
    // Calculate stats
    let totalPresent = 0;
    let totalRegistered = 0;
    reports.forEach(r => {
      totalPresent += Number(r.actualPresent) || 0;
      totalRegistered += Number(r.totalRegistered) || 0;
    });
    
    const pendingReports = reports.filter(r => r.status === 'pending').length;
    const reviewedReports = reports.filter(r => r.status === 'reviewed').length;
    const attendancePercentage = totalRegistered > 0 
      ? Math.round((totalPresent / totalRegistered) * 100) 
      : 0;
    
    res.json({ 
      success: true, 
      stats: {
        totalReports: reports.length,
        pendingReports,
        reviewedReports,
        totalCourses: courses.length,
        totalLecturers: lecturers.length,
        totalStudents: students.length,
        attendancePercentage
      },
      recentReports: reports.slice(0, 20)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { 
  getMonitoringData, 
  getStudentAttendanceMonitoring,
  getLecturerReports,
  getPRLReviewData,
  getPLOverview
};