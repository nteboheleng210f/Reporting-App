const { db } = require('../config/firebase');
const ExcelJS = require('exceljs');

const createReport = async (req, res) => {
  try {
    const {
      facultyName, className, week, date, courseName, courseCode,
      classId, lecturerName, actualPresent, totalRegistered, venue,
      scheduledTime, topic, outcomes, recommendations
    } = req.body;

    if (!topic || !actualPresent) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const reportData = {
      facultyName: facultyName || '',
      className: className || '',
      week: week || '',
      date: date || new Date().toISOString().split('T')[0],
      courseName,
      courseCode,
      classId,
      lecturerId: "test_lecturer",
      lecturerName: lecturerName || '',
      actualPresent: Number(actualPresent),
      totalRegistered: totalRegistered ? Number(totalRegistered) : 0,
      venue: venue || '',
      scheduledTime: scheduledTime || '',
      topic,
      outcomes: outcomes || '',
      recommendations: recommendations || '',
      status: 'pending',
      prlFeedback: '',
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection('lectureReports').add(reportData);

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      reportId: docRef.id
    });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getReports = async (req, res) => {
  try {
    const snapshot = await db.collection('lectureReports').orderBy('createdAt', 'desc').get();
    const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, reports });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const updateReportFeedback = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { prlFeedback } = req.body;

    if (!prlFeedback) {
      return res.status(400).json({ success: false, error: 'Feedback is required' });
    }

    await db.collection('lectureReports').doc(reportId).update({
      prlFeedback: prlFeedback,
      status: 'reviewed',
      reviewedAt: new Date().toISOString()
    });

    res.json({ success: true, message: 'Feedback submitted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getPendingReports = async (req, res) => {
  try {
    const snapshot = await db.collection('lectureReports').where('status', '==', 'pending').get();
    const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, reports });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getReviewedReports = async (req, res) => {
  try {
    const snapshot = await db.collection('lectureReports').where('status', '==', 'reviewed').get();
    const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, reports });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ADD THIS FUNCTION
const exportReportsToExcel = async (req, res) => {
  try {
    // Get all reports
    const snapshot = await db.collection('lectureReports')
      .orderBy('createdAt', 'desc')
      .get();
    
    const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Lecture Reports');

    // Define columns
    worksheet.columns = [
      { header: 'Course Name', key: 'courseName', width: 30 },
      { header: 'Course Code', key: 'courseCode', width: 15 },
      { header: 'Lecturer', key: 'lecturerName', width: 25 },
      { header: 'Faculty', key: 'facultyName', width: 20 },
      { header: 'Class', key: 'className', width: 15 },
      { header: 'Topic', key: 'topic', width: 40 },
      { header: 'Week', key: 'week', width: 10 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Venue', key: 'venue', width: 20 },
      { header: 'Time', key: 'scheduledTime', width: 15 },
      { header: 'Present', key: 'actualPresent', width: 10 },
      { header: 'Registered', key: 'totalRegistered', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'PRL Feedback', key: 'prlFeedback', width: 40 },
    ];

    // Add rows
    reports.forEach(report => {
      worksheet.addRow({
        courseName: report.courseName || '',
        courseCode: report.courseCode || '',
        lecturerName: report.lecturerName || '',
        facultyName: report.facultyName || '',
        className: report.className || '',
        topic: report.topic || '',
        week: report.week || '',
        date: report.date || '',
        venue: report.venue || '',
        scheduledTime: report.scheduledTime || '',
        actualPresent: report.actualPresent || 0,
        totalRegistered: report.totalRegistered || 0,
        status: report.status || 'pending',
        prlFeedback: report.prlFeedback || '',
      });
    });

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F81BD' }
    };

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=lecture_reports.xlsx');

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { 
  createReport, 
  getReports, 
  updateReportFeedback, 
  getPendingReports, 
  getReviewedReports,
  exportReportsToExcel  // Add this
};