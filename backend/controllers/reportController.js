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
// Create report - with duplicate check
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

    // ✅ CHECK FOR DUPLICATE WEEK REPORT
    if (week && classId) {
      const existingSnap = await db.collection('lectureReports')
        .where('lecturerId', '==', lecturerId)
        .where('classId', '==', classId)
        .where('week', '==', Number(week))
        .get();

      if (!existingSnap.empty) {
        return res.status(409).json({ 
          success: false, 
          error: `You have already submitted a report for Week ${week}. Please edit the existing report instead.`,
          existingReportId: existingSnap.docs[0].id
        });
      }
    }

    const reportData = {
      facultyName: facultyName || '',
      className: className || '',
      week: week ? Number(week) : null,
      date: date || new Date().toISOString().split('T')[0],
      courseName,
      courseCode,
      classId: classId || '',
      lecturerId,
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
// ─── PRL: add structured feedback to a report ────────────────────────────────
const updateReportFeedback = async (req, res) => {
  try {
    const { reportId } = req.params;
    const {
      prlFeedback,
      feedbackType,      // 'approved' | 'needs_revision' | 'excellent'
      requiresRevision,  // boolean
      revisionNotes,     // string — what specifically needs fixing
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

// ─── NEW: PRL — mark report as requiring revision ────────────────────────────
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

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F1F3D' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Color-code status column
    reports.forEach((report, i) => {
      const row  = worksheet.getRow(i + 2);
      const cell = row.getCell('status');
      if (report.status === 'reviewed') {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFdcfce7' } };
      } else if (report.status === 'needs_revision') {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFfee2e2' } };
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=lecture_reports.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export reports error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── NEW: Export ratings to Excel ────────────────────────────────────────────
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

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F1F3D' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Color-code rating column (green = 4-5, yellow = 3, red = 1-2)
    ratings.forEach((r, i) => {
      const cell = worksheet.getRow(i + 2).getCell('rating');
      if (r.rating >= 4)      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFdcfce7' } };
      else if (r.rating === 3) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFfef9ec' } };
      else                     cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFfee2e2' } };
    });

    // Summary sheet
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

module.exports = {
  createReport,
  getReports,
  getMyReports,
  updateReportFeedback,
  markRequiresRevision,    // ← new
  getPendingReports,
  getReviewedReports,
  exportReportsToExcel,
  exportRatingsToExcel,    // ← new
};