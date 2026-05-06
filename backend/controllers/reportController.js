const { db } = require('../config/firebase');
const ExcelJS = require('exceljs');

// ─── Submit report — lecturer only ───────────────────────────────────────────
const createReport = async (req, res) => {
  try {
    const {
      facultyName, className, week, date, courseName, courseCode,
      classId, lecturerName, actualPresent, totalRegistered, venue,
      scheduledTime, topic, outcomes, recommendations
    } = req.body;

    const lecturerId = req.headers['x-user-id'];

    if (!lecturerId) {
      return res.status(400).json({ success: false, error: 'Lecturer ID required' });
    }
    if (!topic || !actualPresent) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const reportData = {
      facultyName:      facultyName || '',
      className:        className || '',
      week:             week || '',
      date:             date || new Date().toISOString().split('T')[0],
      courseName:       courseName || '',
      courseCode:       courseCode || '',
      classId:          classId || '',
      lecturerId,
      lecturerName:     lecturerName || '',
      actualPresent:    Number(actualPresent),
      totalRegistered:  totalRegistered ? Number(totalRegistered) : 0,
      venue:            venue || '',
      scheduledTime:    scheduledTime || '',
      topic,
      outcomes:         outcomes || '',
      recommendations:  recommendations || '',
      status:           'pending',
      prlFeedback:      '',
      requiresRevision: false,
      createdAt:        new Date().toISOString()
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

// ─── Get ALL reports (PRL/PL only) ───────────────────────────────────────────
const getReports = async (req, res) => {
  try {
    const snapshot = await db.collection('lectureReports').orderBy('createdAt', 'desc').get();
    const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, reports });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── Get THIS lecturer's own reports only ────────────────────────────────────
const getMyReports = async (req, res) => {
  try {
    const lecturerId = req.headers['x-user-id'];
    if (!lecturerId) return res.json({ success: true, reports: [] });

    const snapshot = await db.collection('lectureReports')
      .where('lecturerId', '==', lecturerId)
      .orderBy('createdAt', 'desc')
      .get();

    const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, reports });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── PRL: add structured feedback to a report ────────────────────────────────
const updateReportFeedback = async (req, res) => {
  try {
    const { reportId } = req.params;
    const {
      prlFeedback,
      feedbackType,
      requiresRevision,
      revisionNotes,
    } = req.body;

    if (!prlFeedback) {
      return res.status(400).json({ success: false, error: 'Feedback is required' });
    }

    const updateData = {
      prlFeedback,
      feedbackType:     feedbackType     || 'approved',
      requiresRevision: requiresRevision || false,
      revisionNotes:    revisionNotes    || '',
      status:           requiresRevision ? 'needs_revision' : 'reviewed',
      reviewedAt:       new Date().toISOString(),
    };

    await db.collection('lectureReports').doc(reportId).update(updateData);

    res.json({ success: true, message: 'Feedback submitted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── PRL — mark report as requiring revision ────────────────────────────────
const markRequiresRevision = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { revisionNotes } = req.body;

    const docSnap = await db.collection('lectureReports').doc(reportId).get();
    if (!docSnap.exists) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    await db.collection('lectureReports').doc(reportId).update({
      requiresRevision: true,
      revisionNotes:    revisionNotes || '',
      status:           'needs_revision',
      markedAt:         new Date().toISOString(),
    });

    res.json({ success: true, message: 'Report marked as requiring revision' });
  } catch (error) {
    console.error('markRequiresRevision error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── PRL: pending reports ─────────────────────────────────────────────────────
const getPendingReports = async (req, res) => {
  try {
    const snapshot = await db.collection('lectureReports')
      .where('status', 'in', ['pending', 'needs_revision'])
      .get();
    const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, reports });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── PRL: reviewed reports ────────────────────────────────────────────────────
const getReviewedReports = async (req, res) => {
  try {
    const snapshot = await db.collection('lectureReports')
      .where('status', '==', 'reviewed')
      .get();
    const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, reports });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── Export reports to Excel ──────────────────────────────────────────────────
const exportReportsToExcel = async (req, res) => {
  try {
    const snapshot = await db.collection('lectureReports').orderBy('createdAt', 'desc').get();
    const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const workbook  = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Lecture Reports');

    worksheet.columns = [
      { header: 'Course Name',       key: 'courseName',       width: 30 },
      { header: 'Course Code',       key: 'courseCode',       width: 15 },
      { header: 'Lecturer',          key: 'lecturerName',     width: 25 },
      { header: 'Faculty',           key: 'facultyName',      width: 20 },
      { header: 'Class',             key: 'className',        width: 15 },
      { header: 'Topic',             key: 'topic',            width: 40 },
      { header: 'Week',              key: 'week',             width: 10 },
      { header: 'Date',              key: 'date',             width: 15 },
      { header: 'Venue',             key: 'venue',            width: 20 },
      { header: 'Time',              key: 'scheduledTime',    width: 15 },
      { header: 'Present',           key: 'actualPresent',    width: 10 },
      { header: 'Registered',        key: 'totalRegistered',  width: 12 },
      { header: 'Status',            key: 'status',           width: 15 },
      { header: 'Requires Revision', key: 'requiresRevision', width: 18 },
      { header: 'PRL Feedback',      key: 'prlFeedback',      width: 40 },
      { header: 'Revision Notes',    key: 'revisionNotes',    width: 40 },
    ];

    reports.forEach(report => {
      worksheet.addRow({
        courseName:       report.courseName       || '',
        courseCode:       report.courseCode       || '',
        lecturerName:     report.lecturerName     || '',
        facultyName:      report.facultyName      || '',
        className:        report.className        || '',
        topic:            report.topic            || '',
        week:             report.week             || '',
        date:             report.date             || '',
        venue:            report.venue            || '',
        scheduledTime:    report.scheduledTime    || '',
        actualPresent:    report.actualPresent    || 0,
        totalRegistered:  report.totalRegistered  || 0,
        status:           report.status           || 'pending',
        requiresRevision: report.requiresRevision ? 'Yes' : 'No',
        prlFeedback:      report.prlFeedback      || '',
        revisionNotes:    report.revisionNotes    || '',
      });
    });

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F1F3D' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=lecture_reports.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export reports error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── Export ratings to Excel ────────────────────────────────────────────
const exportRatingsToExcel = async (req, res) => {
  try {
    const snapshot = await db.collection('ratings').orderBy('createdAt', 'desc').get();
    const ratings  = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const workbook  = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Lecturer Ratings');

    worksheet.columns = [
      { header: 'Lecturer',    key: 'lecturerName', width: 25 },
      { header: 'Course',      key: 'courseName',   width: 30 },
      { header: 'Course Code', key: 'courseCode',   width: 15 },
      { header: 'Class',       key: 'className',    width: 15 },
      { header: 'Student',     key: 'studentName',  width: 25 },
      { header: 'Rating',      key: 'rating',       width: 10 },
      { header: 'Comment',     key: 'comment',      width: 40 },
      { header: 'Date',        key: 'createdAt',    width: 20 },
    ];

    ratings.forEach(r => {
      worksheet.addRow({
        lecturerName: r.lecturerName || '',
        courseName:   r.courseName   || '',
        courseCode:   r.courseCode   || '',
        className:    r.className    || '',
        studentName:  r.studentName  || '',
        rating:       r.rating       || 0,
        comment:      r.comment      || '',
        createdAt:    r.createdAt
          ? new Date(r.createdAt).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'short', year: 'numeric',
            })
          : '',
      });
    });

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F1F3D' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    const summarySheet = workbook.addWorksheet('Summary by Lecturer');
    summarySheet.columns = [
      { header: 'Lecturer',    key: 'name',    width: 25 },
      { header: 'Avg Rating',  key: 'average', width: 12 },
      { header: 'Total Reviews', key: 'count', width: 14 },
    ];

    const lecturerMap = {};
    ratings.forEach(r => {
      if (!lecturerMap[r.lecturerId]) {
        lecturerMap[r.lecturerId] = { name: r.lecturerName, total: 0, count: 0 };
      }
      lecturerMap[r.lecturerId].total += r.rating;
      lecturerMap[r.lecturerId].count++;
    });

    Object.values(lecturerMap).forEach(l => {
      summarySheet.addRow({
        name:    l.name,
        average: (l.total / l.count).toFixed(1),
        count:   l.count,
      });
    });

    const summaryHeader = summarySheet.getRow(1);
    summaryHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    summaryHeader.fill = {
      type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F1F3D' }
    };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=lecturer_ratings.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export ratings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/// Add this function to your reportController.js
const exportReportsToPDF = async (req, res) => {
  try {
    const snapshot = await db.collection('lectureReports').orderBy('createdAt', 'desc').get();
    const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Create HTML content that can be printed as PDF
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Lecture Reports Export</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 40px;
            color: #333;
          }
          h1 {
            color: #2563eb;
            text-align: center;
            margin-bottom: 10px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 10px;
          }
          .date {
            text-align: center;
            color: #666;
            margin-bottom: 30px;
          }
          .report-card {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
            page-break-inside: avoid;
            background: #f9f9f9;
          }
          .report-title {
            font-size: 18px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
          }
          .report-section {
            margin: 10px 0;
          }
          .section-label {
            font-weight: bold;
            color: #555;
            display: inline-block;
            width: 120px;
          }
          .section-value {
            color: #333;
            display: inline-block;
          }
          .feedback-section {
            margin-top: 10px;
            padding: 10px;
            background: #e8f0fe;
            border-radius: 5px;
          }
          .status-pending {
            color: #f59e0b;
            font-weight: bold;
          }
          .status-reviewed {
            color: #10b981;
            font-weight: bold;
          }
          .status-needs_revision {
            color: #ef4444;
            font-weight: bold;
          }
          .summary {
            margin-top: 30px;
            padding: 15px;
            background: #f0f9ff;
            border-radius: 8px;
            margin-bottom: 30px;
          }
          @media print {
            body {
              margin: 0;
              padding: 20px;
            }
            .report-card {
              break-inside: avoid;
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📊 Lecture Reports Export</h1>
          <p>Academic Performance Reports</p>
        </div>
        <div class="date">
          Generated: ${new Date().toLocaleString()}
        </div>
    `;

    // Add summary statistics
    const totalReports = reports.length;
    const reviewedReports = reports.filter(r => r.status === 'reviewed').length;
    const pendingReports = reports.filter(r => r.status === 'pending').length;
    const needsRevisionReports = reports.filter(r => r.status === 'needs_revision').length;

    htmlContent += `
      <div class="summary">
        <h3>Summary Statistics</h3>
        <p><strong>Total Reports:</strong> ${totalReports}</p>
        <p><strong>Reviewed Reports:</strong> ${reviewedReports}</p>
        <p><strong>Pending Reports:</strong> ${pendingReports}</p>
        <p><strong>Need Revision:</strong> ${needsRevisionReports}</p>
      </div>
      
      <h2>Detailed Reports</h2>
    `;

    // Add each report
    reports.forEach(report => {
      const statusClass = report.status === 'reviewed' ? 'status-reviewed' : 
                         report.status === 'needs_revision' ? 'status-needs_revision' : 'status-pending';
      
      htmlContent += `
        <div class="report-card">
          <div class="report-title">
            ${escapeHtml(report.courseName || 'N/A')} (${escapeHtml(report.courseCode || 'N/A')})
          </div>
          
          <div class="report-section">
            <span class="section-label">Lecturer:</span>
            <span class="section-value">${escapeHtml(report.lecturerName || 'N/A')}</span>
          </div>
          
          <div class="report-section">
            <span class="section-label">Faculty:</span>
            <span class="section-value">${escapeHtml(report.facultyName || 'N/A')}</span>
          </div>
          
          <div class="report-section">
            <span class="section-label">Class:</span>
            <span class="section-value">${escapeHtml(report.className || 'N/A')}</span>
          </div>
          
          <div class="report-section">
            <span class="section-label">Topic:</span>
            <span class="section-value">${escapeHtml(report.topic || 'N/A')}</span>
          </div>
          
          <div class="report-section">
            <span class="section-label">Week:</span>
            <span class="section-value">${escapeHtml(report.week || 'N/A')}</span>
          </div>
          
          <div class="report-section">
            <span class="section-label">Date:</span>
            <span class="section-value">${escapeHtml(report.date || 'N/A')}</span>
          </div>
          
          <div class="report-section">
            <span class="section-label">Venue:</span>
            <span class="section-value">${escapeHtml(report.venue || 'N/A')}</span>
          </div>
          
          <div class="report-section">
            <span class="section-label">Time:</span>
            <span class="section-value">${escapeHtml(report.scheduledTime || 'N/A')}</span>
          </div>
          
          <div class="report-section">
            <span class="section-label">Attendance:</span>
            <span class="section-value">${report.actualPresent || 0}/${report.totalRegistered || 0}</span>
          </div>
          
          <div class="report-section">
            <span class="section-label">Status:</span>
            <span class="${statusClass}">${report.status || 'pending'}</span>
          </div>
      `;

      if (report.outcomes) {
        htmlContent += `
          <div class="report-section">
            <span class="section-label">Learning Outcomes:</span>
            <div class="section-value">${escapeHtml(report.outcomes)}</div>
          </div>
        `;
      }

      if (report.recommendations) {
        htmlContent += `
          <div class="report-section">
            <span class="section-label">Recommendations:</span>
            <div class="section-value">${escapeHtml(report.recommendations)}</div>
          </div>
        `;
      }

      if (report.prlFeedback) {
        htmlContent += `
          <div class="feedback-section">
            <strong>PRL Feedback:</strong><br>
            ${escapeHtml(report.prlFeedback)}
          </div>
        `;
      }

      if (report.revisionNotes) {
        htmlContent += `
          <div class="feedback-section" style="background: #fee2e2;">
            <strong>Revision Notes:</strong><br>
            ${escapeHtml(report.revisionNotes)}
          </div>
        `;
      }

      htmlContent += `</div>`;
    });

    htmlContent += `
      </body>
      </html>
    `;

    // Send as HTML file that can be printed to PDF
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', 'attachment; filename=lecture_reports.html');
    res.send(htmlContent);
    
  } catch (error) {
    console.error('Export PDF error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Helper function to escape HTML special characters
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Update module.exports at the bottom of your file
module.exports = {
  createReport,
  getReports,
  getMyReports,
  updateReportFeedback,
  markRequiresRevision,
  getPendingReports,
  getReviewedReports,
  exportReportsToExcel,
  exportReportsToPDF,  // Add this line
  exportRatingsToExcel,
};