const { db } = require('../config/firebase');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

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

// ─── Export reports to PURE PDF using PDFKit ──────────────────────────────────
const exportReportsToPDF = async (req, res) => {
  try {
    console.log('Starting PDF generation...');
    
    const snapshot = await db.collection('lectureReports').orderBy('createdAt', 'desc').get();
    const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    console.log(`Found ${reports.length} reports to export`);

    // Create a new PDF document
    const doc = new PDFDocument({ 
      margin: 50,
      size: 'A4',
      layout: 'portrait'
    });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=lecture_reports.pdf');
    
    // Pipe PDF to response
    doc.pipe(res);
    
    // Add header
    doc.fontSize(25)
       .font('Helvetica-Bold')
       .fillColor('#2563eb')
       .text('Lecture Reports', { align: 'center' })
       .moveDown(0.5);
    
    doc.fontSize(12)
       .font('Helvetica')
       .fillColor('#666666')
       .text('Academic Performance Reports', { align: 'center' })
       .moveDown(0.5);
    
    doc.fontSize(10)
       .fillColor('#999999')
       .text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' })
       .moveDown(1);
    
    // Add horizontal line
    doc.strokeColor('#2563eb')
       .lineWidth(2)
       .moveTo(50, doc.y)
       .lineTo(550, doc.y)
       .stroke()
       .moveDown(1);
    
    // Calculate statistics
    const totalReports = reports.length;
    const reviewedReports = reports.filter(r => r.status === 'reviewed').length;
    const pendingReports = reports.filter(r => r.status === 'pending').length;
    const needsRevisionReports = reports.filter(r => r.status === 'needs_revision').length;
    const totalAttendance = reports.reduce((sum, r) => sum + (r.actualPresent || 0), 0);
    const totalStudents = reports.reduce((sum, r) => sum + (r.totalRegistered || 0), 0);
    const avgAttendance = totalStudents > 0 ? ((totalAttendance / totalStudents) * 100).toFixed(1) : 0;
    
    // Summary section
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fillColor('#2563eb')
       .text('Summary Statistics', { underline: true })
       .moveDown(0.5);
    
    doc.fontSize(11)
       .font('Helvetica')
       .fillColor('#333333');
    
    // Create a table for statistics
    const startY = doc.y;
    let currentY = startY;
    
    doc.text(`Total Reports: ${totalReports}`, 50, currentY);
    doc.text(`Reviewed Reports: ${reviewedReports}`, 250, currentY);
    doc.text(`Pending Reports: ${pendingReports}`, 450, currentY);
    currentY += 20;
    
    doc.text(`Need Revision: ${needsRevisionReports}`, 50, currentY);
    doc.text(`Average Attendance: ${avgAttendance}%`, 250, currentY);
    currentY += 30;
    
    doc.moveDown(1);
    
    // Detailed Reports Section
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fillColor('#2563eb')
       .text('Detailed Reports', { underline: true })
       .moveDown(0.5);
    
    // Loop through each report
    reports.forEach((report, index) => {
      // Check if we need a new page
      if (doc.y > 700) {
        doc.addPage();
      }
      
      // Report header with index
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#2563eb')
         .text(`${index + 1}. ${report.courseName || 'N/A'} (${report.courseCode || 'N/A'})`)
         .moveDown(0.3);
      
      // Report details in two columns
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#333333');
      
      // Left column
      let leftX = 50;
      let rightX = 300;
      let lineHeight = 18;
      let yPos = doc.y;
      
      doc.text(`Lecturer:`, leftX, yPos);
      doc.text(`${report.lecturerName || 'N/A'}`, 120, yPos);
      
      doc.text(`Faculty:`, leftX, yPos + lineHeight);
      doc.text(`${report.facultyName || 'N/A'}`, 120, yPos + lineHeight);
      
      doc.text(`Class:`, leftX, yPos + (lineHeight * 2));
      doc.text(`${report.className || 'N/A'}`, 120, yPos + (lineHeight * 2));
      
      doc.text(`Topic:`, leftX, yPos + (lineHeight * 3));
      doc.text(`${report.topic || 'N/A'}`, 120, yPos + (lineHeight * 3));
      
      doc.text(`Week:`, rightX, yPos);
      doc.text(`${report.week || 'N/A'}`, 350, yPos);
      
      doc.text(`Date:`, rightX, yPos + lineHeight);
      doc.text(`${report.date || 'N/A'}`, 350, yPos + lineHeight);
      
      doc.text(`Venue:`, rightX, yPos + (lineHeight * 2));
      doc.text(`${report.venue || 'N/A'}`, 350, yPos + (lineHeight * 2));
      
      doc.text(`Time:`, rightX, yPos + (lineHeight * 3));
      doc.text(`${report.scheduledTime || 'N/A'}`, 350, yPos + (lineHeight * 3));
      
      let newY = yPos + (lineHeight * 4);
      
      // Attendance with visual bar
      const attendancePercent = report.totalRegistered > 0 
        ? (report.actualPresent / report.totalRegistered) * 100 
        : 0;
      
      doc.text(`Attendance:`, leftX, newY);
      doc.text(`${report.actualPresent || 0}/${report.totalRegistered || 0} (${attendancePercent.toFixed(1)}%)`, 120, newY);
      
      // Draw attendance bar
      const barWidth = 200;
      const barHeight = 8;
      doc.rect(120, newY + 12, barWidth, barHeight)
         .fillColor('#e5e7eb')
         .fill();
      doc.rect(120, newY + 12, (attendancePercent / 100) * barWidth, barHeight)
         .fillColor('#10b981')
         .fill();
      
      newY += 25;
      
      // Status
      let statusColor = '#f59e0b';
      let statusText = 'Pending';
      if (report.status === 'reviewed') {
        statusColor = '#10b981';
        statusText = 'Reviewed';
      } else if (report.status === 'needs_revision') {
        statusColor = '#ef4444';
        statusText = 'Needs Revision';
      }
      
      doc.text(`Status:`, leftX, newY);
      doc.fillColor(statusColor)
         .text(statusText, 120, newY);
      doc.fillColor('#333333');
      
      newY += 20;
      
      // Learning Outcomes
      if (report.outcomes) {
        if (newY > 650) {
          doc.addPage();
          newY = 50;
        }
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .text('Learning Outcomes:', leftX, newY);
        doc.font('Helvetica')
           .fontSize(9)
           .text(report.outcomes, leftX + 100, newY, { width: 400 })
           .moveDown(0.5);
        newY = doc.y + 10;
      }
      
      // Recommendations
      if (report.recommendations) {
        if (newY > 650) {
          doc.addPage();
          newY = 50;
        }
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .text('Recommendations:', leftX, newY);
        doc.font('Helvetica')
           .fontSize(9)
           .text(report.recommendations, leftX + 100, newY, { width: 400 })
           .moveDown(0.5);
        newY = doc.y + 10;
      }
      
      // PRL Feedback
      if (report.prlFeedback) {
        if (newY > 650) {
          doc.addPage();
          newY = 50;
        }
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor('#2563eb')
           .text('PRL Feedback:', leftX, newY);
        doc.font('Helvetica')
           .fontSize(9)
           .fillColor('#333333')
           .text(report.prlFeedback, leftX + 100, newY, { width: 400 })
           .moveDown(0.5);
        newY = doc.y + 10;
      }
      
      // Revision Notes
      if (report.revisionNotes) {
        if (newY > 650) {
          doc.addPage();
          newY = 50;
        }
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor('#ef4444')
           .text('Revision Notes:', leftX, newY);
        doc.font('Helvetica')
           .fontSize(9)
           .fillColor('#333333')
           .text(report.revisionNotes, leftX + 100, newY, { width: 400 })
           .moveDown(0.5);
        newY = doc.y + 10;
      }
      
      // Separator line between reports
      doc.moveDown(0.5)
         .strokeColor('#e5e7eb')
         .lineWidth(0.5)
         .moveTo(50, newY + 10)
         .lineTo(550, newY + 10)
         .stroke()
         .moveDown(1);
    });
    
    // Add footer
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fontSize(8)
         .fillColor('#999999')
         .text(
           `Generated by Lecture Report System • Page ${i + 1} of ${pageCount}`,
           50,
           doc.page.height - 50,
           { align: 'center', width: 500 }
         );
    }
    
    // Finalize PDF
    doc.end();
    console.log('PDF generated successfully');
    
  } catch (error) {
    console.error('PDF Export error:', error);
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