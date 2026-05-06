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

// ─── Export reports to HTML/PDF (printable format) ───────────────────────────
const exportReportsToPDF = async (req, res) => {
  try {
    console.log('Starting HTML export...');
    
    const snapshot = await db.collection('lectureReports').orderBy('createdAt', 'desc').get();
    const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    console.log(`Found ${reports.length} reports to export`);

    // Simple HTML template
    let htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Lecture Reports Export</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            margin: 20px;
            color: #333;
            background: white;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        h1 {
            color: #2563eb;
            text-align: center;
            font-size: 28px;
            margin-bottom: 10px;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #2563eb;
        }
        .subtitle {
            color: #666;
            font-size: 14px;
        }
        .date {
            text-align: center;
            color: #666;
            font-size: 12px;
            margin-bottom: 30px;
        }
        .summary {
            background: #f0f9ff;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            border-left: 4px solid #2563eb;
        }
        .summary h2 {
            color: #2563eb;
            font-size: 18px;
            margin-bottom: 15px;
        }
        .summary-grid {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
        }
        .stat-card {
            flex: 1;
            min-width: 150px;
            padding: 15px;
            background: white;
            border-radius: 8px;
            text-align: center;
        }
        .stat-label {
            font-size: 12px;
            color: #666;
            margin-bottom: 5px;
        }
        .stat-value {
            font-size: 28px;
            font-weight: bold;
            color: #2563eb;
        }
        .reports-section {
            margin-top: 30px;
        }
        .reports-section h2 {
            color: #2563eb;
            font-size: 20px;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e5e7eb;
        }
        .report-card {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            page-break-inside: avoid;
            background: white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .report-title {
            font-size: 18px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e5e7eb;
        }
        .info-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            margin-bottom: 15px;
        }
        .info-item {
            flex: 1;
            min-width: 200px;
        }
        .info-label {
            font-weight: bold;
            color: #4b5563;
            font-size: 12px;
            margin-bottom: 5px;
        }
        .info-value {
            color: #1f2937;
            font-size: 14px;
        }
        .status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }
        .status-pending {
            background: #fef3c7;
            color: #d97706;
        }
        .status-reviewed {
            background: #d1fae5;
            color: #059669;
        }
        .status-needs_revision {
            background: #fee2e2;
            color: #dc2626;
        }
        .feedback-box {
            margin-top: 15px;
            padding: 12px;
            background: #f3f4f6;
            border-radius: 6px;
            border-left: 3px solid #2563eb;
        }
        .feedback-title {
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 8px;
            font-size: 13px;
        }
        .feedback-text {
            color: #374151;
            font-size: 13px;
            line-height: 1.5;
        }
        .attendance-bar {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-top: 5px;
        }
        .attendance-progress {
            flex: 1;
            height: 8px;
            background: #e5e7eb;
            border-radius: 4px;
            overflow: hidden;
        }
        .attendance-fill {
            height: 100%;
            background: #10b981;
            border-radius: 4px;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 11px;
            color: #9ca3af;
            border-top: 1px solid #e5e7eb;
            padding-top: 20px;
        }
        @media print {
            body {
                margin: 0;
                padding: 10px;
            }
            .report-card {
                break-inside: avoid;
                page-break-inside: avoid;
            }
            .export-btn {
                display: none;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Lecture Reports Export</h1>
            <div class="subtitle">Academic Performance Reports</div>
        </div>
        <div class="date">
            Generated: ${new Date().toLocaleString()}
        </div>`;

    // Calculate statistics
    const totalReports = reports.length;
    const reviewedReports = reports.filter(r => r.status === 'reviewed').length;
    const pendingReports = reports.filter(r => r.status === 'pending').length;
    const needsRevisionReports = reports.filter(r => r.status === 'needs_revision').length;
    const totalAttendance = reports.reduce((sum, r) => sum + (r.actualPresent || 0), 0);
    const totalStudents = reports.reduce((sum, r) => sum + (r.totalRegistered || 0), 0);
    const avgAttendance = totalStudents > 0 ? ((totalAttendance / totalStudents) * 100).toFixed(1) : 0;

    htmlContent += `
        <div class="summary">
            <h2>📈 Summary Statistics</h2>
            <div class="summary-grid">
                <div class="stat-card">
                    <div class="stat-label">Total Reports</div>
                    <div class="stat-value">${totalReports}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Reviewed</div>
                    <div class="stat-value" style="color: #10b981;">${reviewedReports}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Pending</div>
                    <div class="stat-value" style="color: #f59e0b;">${pendingReports}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Need Revision</div>
                    <div class="stat-value" style="color: #ef4444;">${needsRevisionReports}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Avg Attendance</div>
                    <div class="stat-value">${avgAttendance}%</div>
                </div>
            </div>
        </div>
        
        <div class="reports-section">
            <h2>📋 Detailed Reports</h2>`;

    // Add each report
    reports.forEach((report, index) => {
      const statusClass = `status-${report.status || 'pending'}`;
      const statusText = report.status === 'reviewed' ? 'Reviewed' : 
                        report.status === 'needs_revision' ? 'Needs Revision' : 'Pending';
      
      const attendancePercentage = report.totalRegistered > 0 
        ? ((report.actualPresent / report.totalRegistered) * 100).toFixed(1) 
        : 0;
      
      // Safely escape strings
      const safeCourseName = (report.courseName || 'N/A').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const safeCourseCode = (report.courseCode || 'N/A').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const safeLecturerName = (report.lecturerName || 'N/A').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const safeFacultyName = (report.facultyName || 'N/A').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const safeClassName = (report.className || 'N/A').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const safeTopic = (report.topic || 'N/A').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const safeWeek = (report.week || 'N/A').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const safeDate = (report.date || 'N/A').toString();
      const safeVenue = (report.venue || 'N/A').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const safeTime = (report.scheduledTime || 'N/A').toString();
      const safeOutcomes = (report.outcomes || '').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const safeRecommendations = (report.recommendations || '').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const safePrlFeedback = (report.prlFeedback || '').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const safeRevisionNotes = (report.revisionNotes || '').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;');
      
      htmlContent += `
            <div class="report-card">
                <div class="report-title">${index + 1}. ${safeCourseName} (${safeCourseCode})</div>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">👨‍🏫 Lecturer</div>
                        <div class="info-value">${safeLecturerName}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">🏛 Faculty</div>
                        <div class="info-value">${safeFacultyName}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">📚 Class</div>
                        <div class="info-value">${safeClassName}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">📖 Topic</div>
                        <div class="info-value">${safeTopic}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">📅 Week</div>
                        <div class="info-value">${safeWeek}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">📆 Date</div>
                        <div class="info-value">${safeDate}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">📍 Venue</div>
                        <div class="info-value">${safeVenue}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">⏰ Time</div>
                        <div class="info-value">${safeTime}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">👥 Attendance</div>
                        <div class="info-value">
                            ${report.actualPresent || 0}/${report.totalRegistered || 0}
                            <div class="attendance-bar">
                                <div class="attendance-progress">
                                    <div class="attendance-fill" style="width: ${attendancePercentage}%"></div>
                                </div>
                                <span>${attendancePercentage}%</span>
                            </div>
                        </div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">📊 Status</div>
                        <div class="info-value">
                            <span class="status ${statusClass}">${statusText}</span>
                        </div>
                    </div>
                </div>`;

      if (safeOutcomes) {
        htmlContent += `
                <div class="info-item" style="margin-top: 10px;">
                    <div class="info-label">🎯 Learning Outcomes</div>
                    <div class="info-value">${safeOutcomes}</div>
                </div>`;
      }

      if (safeRecommendations) {
        htmlContent += `
                <div class="info-item" style="margin-top: 10px;">
                    <div class="info-label">💡 Recommendations</div>
                    <div class="info-value">${safeRecommendations}</div>
                </div>`;
      }

      if (safePrlFeedback) {
        htmlContent += `
                <div class="feedback-box">
                    <div class="feedback-title">📝 PRL Feedback</div>
                    <div class="feedback-text">${safePrlFeedback}</div>
                </div>`;
      }

      if (safeRevisionNotes) {
        htmlContent += `
                <div class="feedback-box" style="border-left-color: #ef4444;">
                    <div class="feedback-title" style="color: #ef4444;">🔄 Revision Notes</div>
                    <div class="feedback-text">${safeRevisionNotes}</div>
                </div>`;
      }

      htmlContent += `
            </div>`;
    });

    htmlContent += `
        </div>
        <div class="footer">
            <p>Generated by Lecture Report System • ${new Date().toLocaleString()}</p>
            <p>This is an automatically generated document</p>
            <p style="margin-top: 10px;">💡 Tip: Use browser's Print function (Ctrl+P) to save as PDF</p>
        </div>
    </div>
</body>
</html>`;

    // Send as HTML file
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', 'attachment; filename=lecture_reports.html');
    res.send(htmlContent);
    
    console.log('HTML export completed successfully');
    
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: error.stack 
    });
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

// ─── Module Exports ──────────────────────────────────────────────────────────
module.exports = {
  createReport,
  getReports,
  getMyReports,
  updateReportFeedback,
  markRequiresRevision,
  getPendingReports,
  getReviewedReports,
  exportReportsToExcel,
  exportReportsToPDF,
  exportRatingsToExcel,
};