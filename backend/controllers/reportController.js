const { db } = require('../config/firebase');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

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
    if (!week) {
      return res.status(400).json({ success: false, error: 'Week number is required' });
    }

    const existingSnap = await db.collection('lectureReports')
      .where('lecturerId', '==', lecturerId)
      .where('courseCode', '==', courseCode || '')
      .where('week', '==', Number(week))
      .get();

    if (!existingSnap.empty) {
      return res.status(400).json({
        success: false,
        error: `You have already submitted a report for ${courseName} in Week ${week}. Each course can only have one report per week.`
      });
    }

    const reportData = {
      facultyName:      facultyName     || '',
      className:        className       || '',
      week:             Number(week),
      date:             date            || new Date().toISOString().split('T')[0],
      courseName:       courseName      || '',
      courseCode:       courseCode      || '',
      classId:          classId         || '',
      lecturerId,
      lecturerName:     lecturerName    || '',
      actualPresent:    Number(actualPresent),
      totalRegistered:  totalRegistered ? Number(totalRegistered) : 0,
      venue:            venue           || '',
      scheduledTime:    scheduledTime   || '',
      topic,
      outcomes:         outcomes        || '',
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

const getReports = async (req, res) => {
  try {
    const snapshot = await db.collection('lectureReports').orderBy('createdAt', 'desc').get();
    const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, reports });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

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

const exportSingleReportToExcel = async (req, res) => {
  try {
    const { reportId } = req.params;
    
    const docSnap = await db.collection('lectureReports').doc(reportId).get();
    if (!docSnap.exists) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }
    
    const report = { id: docSnap.id, ...docSnap.data() };
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Lecture Report');
    
    worksheet.columns = [
      { header: 'Field', key: 'field', width: 30 },
      { header: 'Value', key: 'value', width: 50 },
    ];
    
    worksheet.addRow({ field: 'Course Name', value: report.courseName || '' });
    worksheet.addRow({ field: 'Course Code', value: report.courseCode || '' });
    worksheet.addRow({ field: 'Lecturer', value: report.lecturerName || '' });
    worksheet.addRow({ field: 'Faculty', value: report.facultyName || '' });
    worksheet.addRow({ field: 'Class', value: report.className || '' });
    worksheet.addRow({ field: 'Topic', value: report.topic || '' });
    worksheet.addRow({ field: 'Week', value: report.week || '' });
    worksheet.addRow({ field: 'Date', value: report.date || '' });
    worksheet.addRow({ field: 'Venue', value: report.venue || '' });
    worksheet.addRow({ field: 'Time', value: report.scheduledTime || '' });
    worksheet.addRow({ field: 'Present', value: report.actualPresent || 0 });
    worksheet.addRow({ field: 'Registered', value: report.totalRegistered || 0 });
    worksheet.addRow({ field: 'Status', value: report.status || 'pending' });
    worksheet.addRow({ field: 'PRL Feedback', value: report.prlFeedback || '' });
    worksheet.addRow({ field: 'Revision Notes', value: report.revisionNotes || '' });
    worksheet.addRow({ field: 'Learning Outcomes', value: report.outcomes || '' });
    worksheet.addRow({ field: 'Recommendations', value: report.recommendations || '' });
    
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F1F3D' }
    };
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=report_${report.courseCode}_week${report.week}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export single report error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const exportSingleReportToPDF = async (req, res) => {
  try {
    const { reportId } = req.params;
    
    const docSnap = await db.collection('lectureReports').doc(reportId).get();
    if (!docSnap.exists) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }
    
    const report = { id: docSnap.id, ...docSnap.data() };
    
    const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'portrait' });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=report_${report.courseCode}_week${report.week}.pdf`);
    
    doc.pipe(res);
    
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#2563eb').text('Lecture Report', { align: 'center' }).moveDown(1);
    doc.fontSize(14).font('Helvetica-Bold').text(`Course: ${report.courseName || 'N/A'} (${report.courseCode || 'N/A'})`).moveDown(0.5);
    doc.fontSize(12).font('Helvetica').text(`Lecturer: ${report.lecturerName || 'N/A'}`).moveDown(0.3);
    doc.text(`Faculty: ${report.facultyName || 'N/A'}`).moveDown(0.3);
    doc.text(`Class: ${report.className || 'N/A'}`).moveDown(0.3);
    doc.text(`Topic: ${report.topic || 'N/A'}`).moveDown(0.3);
    doc.text(`Week: ${report.week || 'N/A'}`).moveDown(0.3);
    doc.text(`Date: ${report.date || 'N/A'}`).moveDown(0.3);
    doc.text(`Venue: ${report.venue || 'N/A'}`).moveDown(0.3);
    doc.text(`Time: ${report.scheduledTime || 'N/A'}`).moveDown(0.5);
    
    const attendancePercent = report.totalRegistered > 0 ? (report.actualPresent / report.totalRegistered) * 100 : 0;
    doc.text(`Attendance: ${report.actualPresent || 0}/${report.totalRegistered || 0} (${attendancePercent.toFixed(1)}%)`).moveDown(0.5);
    
    let statusColor = '#f59e0b';
    let statusText = 'Pending';
    if (report.status === 'reviewed') {
      statusColor = '#10b981';
      statusText = 'Reviewed';
    } else if (report.status === 'needs_revision') {
      statusColor = '#ef4444';
      statusText = 'Needs Revision';
    }
    
    doc.fillColor(statusColor).text(`Status: ${statusText}`).moveDown(0.5);
    doc.fillColor('#333333');
    
    if (report.outcomes) {
      doc.fontSize(11).font('Helvetica-Bold').text('Learning Outcomes:', { underline: true }).moveDown(0.3);
      doc.fontSize(10).font('Helvetica').text(report.outcomes).moveDown(0.5);
    }
    
    if (report.recommendations) {
      doc.fontSize(11).font('Helvetica-Bold').text('Recommendations:', { underline: true }).moveDown(0.3);
      doc.fontSize(10).font('Helvetica').text(report.recommendations).moveDown(0.5);
    }
    
    if (report.prlFeedback) {
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#2563eb').text('PRL Feedback:', { underline: true }).moveDown(0.3);
      doc.fontSize(10).font('Helvetica').fillColor('#333333').text(report.prlFeedback).moveDown(0.5);
    }
    
    if (report.revisionNotes) {
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#ef4444').text('Revision Notes:', { underline: true }).moveDown(0.3);
      doc.fontSize(10).font('Helvetica').fillColor('#333333').text(report.revisionNotes);
    }
    
    doc.end();
  } catch (error) {
    console.error('Export single PDF error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const exportAllReportsToExcel = async (req, res) => {
  try {
    const snapshot = await db.collection('lectureReports').orderBy('createdAt', 'desc').get();
    const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('All Lecture Reports');
    
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
      { header: 'Status', key: 'status', width: 15 },
      { header: 'PRL Feedback', key: 'prlFeedback', width: 40 },
      { header: 'Revision Notes', key: 'revisionNotes', width: 40 },
    ];
    
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
        revisionNotes: report.revisionNotes || '',
      });
    });
    
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F1F3D' }
    };
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=all_reports.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export all reports error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const exportAllReportsToPDF = async (req, res) => {
  try {
    const snapshot = await db.collection('lectureReports').orderBy('createdAt', 'desc').get();
    const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'portrait' });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=all_reports.pdf');
    
    doc.pipe(res);
    
    doc.fontSize(25).font('Helvetica-Bold').fillColor('#2563eb').text('All Lecture Reports', { align: 'center' }).moveDown(1);
    doc.fontSize(10).fillColor('#666666').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' }).moveDown(1);
    doc.fontSize(14).font('Helvetica-Bold').text(`Total Reports: ${reports.length}`, { align: 'center' }).moveDown(1);
    
    doc.strokeColor('#2563eb').lineWidth(2).moveTo(50, doc.y).lineTo(550, doc.y).stroke().moveDown(1);
    
    let count = 0;
    for (const report of reports) {
      count++;
      
      if (doc.y > 700) {
        doc.addPage();
      }
      
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#2563eb').text(`${count}. ${report.courseName || 'N/A'} (${report.courseCode || 'N/A'})`).moveDown(0.3);
      doc.fontSize(9).font('Helvetica').fillColor('#333333');
      doc.text(`Lecturer: ${report.lecturerName || 'N/A'}`, 50, doc.y);
      doc.text(`Week: ${report.week || 'N/A'}`, 300, doc.y);
      doc.moveDown(0.3);
      doc.text(`Topic: ${report.topic || 'N/A'}`, 50, doc.y);
      doc.text(`Date: ${report.date || 'N/A'}`, 300, doc.y);
      doc.moveDown(0.3);
      
      const attendancePercent = report.totalRegistered > 0 ? (report.actualPresent / report.totalRegistered) * 100 : 0;
      doc.text(`Attendance: ${report.actualPresent || 0}/${report.totalRegistered || 0} (${attendancePercent.toFixed(1)}%)`, 50, doc.y);
      
      let statusColor = '#f59e0b';
      let statusText = 'Pending';
      if (report.status === 'reviewed') {
        statusColor = '#10b981';
        statusText = 'Reviewed';
      } else if (report.status === 'needs_revision') {
        statusColor = '#ef4444';
        statusText = 'Needs Revision';
      }
      
      doc.fillColor(statusColor).text(`Status: ${statusText}`, 300, doc.y - 12);
      doc.fillColor('#333333');
      doc.moveDown(0.5);
      
      if (report.prlFeedback) {
        doc.fontSize(8).fillColor('#666666').text(`PRL Feedback: ${report.prlFeedback.substring(0, 100)}${report.prlFeedback.length > 100 ? '...' : ''}`, 50, doc.y, { width: 500 });
        doc.moveDown(0.3);
      }
      
      doc.strokeColor('#e5e7eb').lineWidth(0.5).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);
    }
    
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).fillColor('#999999').text(
        `Generated by Lecture Report System • Page ${i + 1} of ${pageCount}`,
        50,
        doc.page.height - 50,
        { align: 'center', width: 500 }
      );
    }
    
    doc.end();
  } catch (error) {
    console.error('Export all PDF error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const exportRatingsToExcel = async (req, res) => {
  try {
    const snapshot = await db.collection('ratings').orderBy('createdAt', 'desc').get();
    const ratings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Lecturer Ratings');

    worksheet.columns = [
      { header: 'Lecturer', key: 'lecturerName', width: 25 },
      { header: 'Course', key: 'courseName', width: 30 },
      { header: 'Course Code', key: 'courseCode', width: 15 },
      { header: 'Class', key: 'className', width: 15 },
      { header: 'Rating', key: 'rating', width: 10 },
      { header: 'Comment', key: 'comment', width: 40 },
      { header: 'Date', key: 'createdAt', width: 20 },
    ];

    ratings.forEach(r => {
      worksheet.addRow({
        lecturerName: r.lecturerName || '',
        courseName: r.courseName || '',
        courseCode: r.courseCode || '',
        className: r.className || '',
        rating: r.rating || 0,
        comment: r.comment || '',
        createdAt: r.createdAt
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
      { header: 'Lecturer', key: 'name', width: 25 },
      { header: 'Avg Rating', key: 'average', width: 12 },
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
        name: l.name,
        average: (l.total / l.count).toFixed(1),
        count: l.count,
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
  markRequiresRevision,
  getPendingReports,
  getReviewedReports,
  exportSingleReportToExcel,
  exportSingleReportToPDF,
  exportAllReportsToExcel,
  exportAllReportsToPDF,
  exportRatingsToExcel,
};