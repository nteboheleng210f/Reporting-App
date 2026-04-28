const { db } = require('../config/firebase');

// Get PRL dashboard stats
const getPRLStats = async (req, res) => {
  try {
    const prlId = req.user?.uid || req.headers['x-user-id'];
    
    console.log("PRL Dashboard - User ID:", prlId);
    
    // Get all courses
    const coursesSnap = await db.collection('courses').get();
    const courses = coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
   
    const lecturerIds = [...new Set(courses.map(c => c.lecturerId).filter(Boolean))];
    
    // Get all reports
    const reportsSnap = await db.collection('lectureReports').get();
    const reports = reportsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const pending = reports.filter(r => r.status === "pending").length;
    const reviewed = reports.filter(r => r.status === "reviewed").length;
    
    // Get all users
    const usersSnap = await db.collection('users').get();
    const lecturersCount = usersSnap.docs.filter(doc => doc.data().role === 'lecturer').length;
    
    res.json({
      success: true,
      stats: {
        courses: courses.length,
        lecturers: lecturersCount,
        pendingReports: pending,
        reviewedReports: reviewed,
      }
    });
  } catch (error) {
    console.error("PRL Stats error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get courses for PRL (all courses they oversee)
const getPRLCourses = async (req, res) => {
  try {
    const snapshot = await db.collection('courses').get();
    const courses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, courses });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get pending reports for PRL
const getPendingReports = async (req, res) => {
  try {
    const snapshot = await db.collection('lectureReports')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .get();
    
    const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, reports });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Submit feedback on report
const submitFeedback = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { feedback } = req.body;
    
    if (!feedback) {
      return res.status(400).json({ success: false, error: 'Feedback is required' });
    }
    
    await db.collection('lectureReports').doc(reportId).update({
      prlFeedback: feedback,
      status: 'reviewed',
      reviewedAt: new Date().toISOString(),
      reviewedBy: req.user?.uid || 'prl'
    });
    
    res.json({ success: true, message: 'Feedback submitted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { getPRLStats, getPRLCourses, getPendingReports, submitFeedback };