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

// ─── Export reports to BEAUTIFUL PDF using PDFKit ──────────────────────────────
const exportReportsToPDF = async (req, res) => {
  try {
    console.log('Starting beautiful PDF generation...');
    
    const snapshot = await db.collection('lectureReports').orderBy('createdAt', 'desc').get();
    const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    console.log(`Found ${reports.length} reports to export`);

    // Create a new PDF document with custom settings
    const doc = new PDFDocument({ 
      margin: 50,
      size: 'A4',
      layout: 'portrait',
      info: {
        Title: 'Lecture Reports Export',
        Author: 'Lecture Report System',
        Subject: 'Academic Performance Reports',
        Keywords: 'lecture, reports, academic'
      }
    });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=lecture_reports.pdf');
    
    // Pipe PDF to response
    doc.pipe(res);
    
    // Register custom fonts (optional - if you have font files)
    // doc.registerFont('Regular', 'path/to/font.ttf');
    
    // Colors
    const colors = {
      primary: '#2563eb',
      secondary: '#3b82f6',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
      dark: '#1f2937',
      gray: '#6b7280',
      lightGray: '#f3f4f6',
      border: '#e5e7eb',
      white: '#ffffff'
    };
    
    // ==================== COVER PAGE ====================
    doc.fontSize(32)
       .font('Helvetica-Bold')
       .fillColor(colors.primary)
       .text('LECTURE REPORTS', { align: 'center' })
       .moveDown(0.5);
    
    doc.fontSize(16)
       .font('Helvetica')
       .fillColor(colors.gray)
       .text('Academic Performance & Quality Assurance Report', { align: 'center' })
       .moveDown(0.5);
    
    doc.fontSize(12)
       .fillColor(colors.gray)
       .text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' })
       .moveDown(2);
    
    // Add decorative line
    doc.strokeColor(colors.primary)
       .lineWidth(2)
       .moveTo(100, doc.y)
       .lineTo(500, doc.y)
       .stroke()
       .moveDown(2);
    
    // Add logo/icon placeholder
    doc.fontSize(48)
       .fillColor(colors.primary)
       .text('📊', { align: 'center' })
       .moveDown(1);
    
    doc.fontSize(11)
       .fillColor(colors.gray)
       .text('This report provides a comprehensive overview of lecture deliveries,', { align: 'center' })
       .text('attendance tracking, and quality assurance feedback.', { align: 'center' })
       .moveDown(3);
    
    doc.fontSize(10)
       .fillColor(colors.gray)
       .text('Confidential Document', { align: 'center', italic: true })
       .text(`Report ID: LRS-${Date.now()}`, { align: 'center' });
    
    doc.addPage();
    
    // ==================== TABLE OF CONTENTS ====================
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .fillColor(colors.primary)
       .text('Table of Contents', { underline: true })
       .moveDown(1);
    
    let tocY = doc.y;
    doc.fontSize(11)
       .font('Helvetica')
       .fillColor(colors.dark);
    
    doc.text('1. Executive Summary', 50, tocY);
    doc.text('2. Key Statistics', 300, tocY);
    tocY += 20;
    
    doc.text('3. Detailed Reports', 50, tocY);
    doc.text(`   • Total Reports: ${reports.length}`, 70, tocY + 20);
    doc.text(`   • Reviewed: ${reports.filter(r => r.status === 'reviewed').length}`, 70, tocY + 40);
    doc.text(`   • Pending: ${reports.filter(r => r.status === 'pending').length}`, 70, tocY + 60);
    doc.text(`   • Needs Revision: ${reports.filter(r => r.status === 'needs_revision').length}`, 70, tocY + 80);
    
    doc.addPage();
    
    // ==================== EXECUTIVE SUMMARY ====================
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .fillColor(colors.primary)
       .text('Executive Summary', { underline: true })
       .moveDown(1);
    
    const totalAttendance = reports.reduce((sum, r) => sum + (r.actualPresent || 0), 0);
    const totalStudents = reports.reduce((sum, r) => sum + (r.totalRegistered || 0), 0);
    const avgAttendance = totalStudents > 0 ? ((totalAttendance / totalStudents) * 100).toFixed(1) : 0;
    const completionRate = reports.length > 0 ? ((reports.filter(r => r.status === 'reviewed').length / reports.length) * 100).toFixed(1) : 0;
    
    doc.fontSize(11)
       .font('Helvetica')
       .fillColor(colors.dark)
       .text(`This report summarizes ${reports.length} lecture deliveries across various courses and departments.`, { align: 'justify' })
       .moveDown(0.5)
       .text(`The overall attendance rate stands at ${avgAttendance}%, with ${reports.filter(r => r.status === 'reviewed').length} reports fully reviewed and ${completionRate}% completion rate.`, { align: 'justify' })
       .moveDown(1);
    
    // Key highlights box
    const boxY = doc.y;
    doc.rect(50, boxY, 500, 120)
       .fillColor(colors.lightGray)
       .fill()
       .strokeColor(colors.primary)
       .lineWidth(1)
       .stroke();
    
    doc.fillColor(colors.primary)
       .fontSize(12)
       .font('Helvetica-Bold')
       .text('KEY HIGHLIGHTS', 70, boxY + 15);
    
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor(colors.dark)
       .text(`• Total Lectures Delivered: ${reports.length}`, 70, boxY + 40)
       .text(`• Average Attendance Rate: ${avgAttendance}%`, 70, boxY + 60)
       .text(`• Quality Review Completion: ${completionRate}%`, 70, boxY + 80)
       .text(`• Pending Reviews: ${reports.filter(r => r.status === 'pending').length}`, 70, boxY + 100);
    
    doc.moveDown(4);
    
    // ==================== STATISTICS SECTION ====================
    doc.addPage();
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .fillColor(colors.primary)
       .text('Key Performance Statistics', { underline: true })
       .moveDown(1);
    
    // Statistics cards layout
    const stats = [
      { label: 'Total Reports', value: reports.length, icon: '📋', color: colors.primary },
      { label: 'Reviewed', value: reports.filter(r => r.status === 'reviewed').length, icon: '✅', color: colors.success },
      { label: 'Pending', value: reports.filter(r => r.status === 'pending').length, icon: '⏳', color: colors.warning },
      { label: 'Needs Revision', value: reports.filter(r => r.status === 'needs_revision').length, icon: '🔄', color: colors.danger },
      { label: 'Avg Attendance', value: `${avgAttendance}%`, icon: '👥', color: colors.primary },
      { label: 'Total Students', value: totalStudents, icon: '🎓', color: colors.secondary }
    ];
    
    let statsY = doc.y;
    stats.forEach((stat, index) => {
      const col = index % 2;
      const x = col === 0 ? 50 : 310;
      const y = statsY + Math.floor(index / 2) * 80;
      
      // Card background
      doc.rect(x, y, 240, 70)
         .fillColor(colors.lightGray)
         .fill()
         .strokeColor(colors.border)
         .stroke();
      
      // Icon
      doc.fontSize(28)
         .fillColor(stat.color)
         .text(stat.icon, x + 15, y + 15);
      
      // Label
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor(colors.gray)
         .text(stat.label, x + 60, y + 15);
      
      // Value
      doc.fontSize(24)
         .font('Helvetica-Bold')
         .fillColor(stat.color)
         .text(String(stat.value), x + 60, y + 30);
    });
    
    doc.moveDown(5);
    
    // ==================== DETAILED REPORTS ====================
    doc.addPage();
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .fillColor(colors.primary)
       .text('Detailed Lecture Reports', { underline: true })
       .moveDown(1);
    
    // Loop through each report
    reports.forEach((report, index) => {
      // Check if we need a new page
      if (doc.y > 680) {
        doc.addPage();
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .fillColor(colors.primary)
           .text('Detailed Reports (continued)', { underline: true })
           .moveDown(1);
      }
      
      // Report header with gradient-like effect
      const headerY = doc.y;
      doc.rect(50, headerY, 500, 35)
         .fillColor(colors.primary)
         .fill();
      
      doc.fillColor(colors.white)
         .fontSize(12)
         .font('Helvetica-Bold')
         .text(`${index + 1}. ${report.courseName || 'N/A'} (${report.courseCode || 'N/A'})`, 60, headerY + 10);
      
      doc.moveDown(2);
      
      // Two-column layout for report details
      const startX = 50;
      const col1X = 60;
      const col2X = 310;
      let currentY = doc.y;
      let lineHeight = 22;
      
      // Column 1
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor(colors.gray);
      
      doc.text('Course Information', col1X, currentY);
      currentY += 18;
      
      doc.font('Helvetica')
         .fillColor(colors.dark);
      
      doc.text('Course Name:', col1X, currentY);
      doc.text(report.courseName || 'N/A', col1X + 100, currentY);
      currentY += lineHeight;
      
      doc.text('Course Code:', col1X, currentY);
      doc.text(report.courseCode || 'N/A', col1X + 100, currentY);
      currentY += lineHeight;
      
      doc.text('Faculty:', col1X, currentY);
      doc.text(report.facultyName || 'N/A', col1X + 100, currentY);
      currentY += lineHeight;
      
      doc.text('Class:', col1X, currentY);
      doc.text(report.className || 'N/A', col1X + 100, currentY);
      currentY += lineHeight;
      
      // Column 2
      let col2Y = doc.y;
      
      doc.font('Helvetica-Bold')
         .fillColor(colors.gray);
      
      doc.text('Lecture Details', col2X, col2Y);
      col2Y += 18;
      
      doc.font('Helvetica')
         .fillColor(colors.dark);
      
      doc.text('Lecturer:', col2X, col2Y);
      doc.text(report.lecturerName || 'N/A', col2X + 80, col2Y);
      col2Y += lineHeight;
      
      doc.text('Topic:', col2X, col2Y);
      doc.text(report.topic || 'N/A', col2X + 80, col2Y);
      col2Y += lineHeight;
      
      doc.text('Week:', col2X, col2Y);
      doc.text(report.week || 'N/A', col2X + 80, col2Y);
      col2Y += lineHeight;
      
      doc.text('Date:', col2X, col2Y);
      doc.text(report.date || 'N/A', col2X + 80, col2Y);
      col2Y += lineHeight;
      
      doc.text('Venue:', col2X, col2Y);
      doc.text(report.venue || 'N/A', col2X + 80, col2Y);
      col2Y += lineHeight;
      
      doc.text('Time:', col2X, col2Y);
      doc.text(report.scheduledTime || 'N/A', col2X + 80, col2Y);
      col2Y += lineHeight;
      
      // Set Y position to the maximum of both columns
      doc.y = Math.max(currentY, col2Y) + 10;
      
      // Attendance section with visual bar
      const attendancePercent = report.totalRegistered > 0 
        ? (report.actualPresent / report.totalRegistered) * 100 
        : 0;
      
      doc.font('Helvetica-Bold')
         .fillColor(colors.gray)
         .text('Attendance Summary', 50, doc.y);
      doc.moveDown(0.5);
      
      // Attendance numbers
      doc.font('Helvetica')
         .fillColor(colors.dark)
         .text(`Present: ${report.actualPresent || 0} students`, 60, doc.y);
      doc.text(`Registered: ${report.totalRegistered || 0} students`, 250, doc.y);
      doc.text(`Rate: ${attendancePercent.toFixed(1)}%`, 400, doc.y);
      doc.moveDown(0.5);
      
      // Visual attendance bar
      const barY = doc.y;
      const barWidth = 500;
      const barHeight = 20;
      
      doc.rect(50, barY, barWidth, barHeight)
         .fillColor('#e5e7eb')
         .fill();
      
      doc.rect(50, barY, (attendancePercent / 100) * barWidth, barHeight)
         .fillColor(attendancePercent >= 75 ? colors.success : attendancePercent >= 50 ? colors.warning : colors.danger)
         .fill();
      
      // Percentage text on bar
      doc.fillColor(attendancePercent > 50 ? colors.white : colors.dark)
         .fontSize(10)
         .font('Helvetica-Bold')
         .text(`${attendancePercent.toFixed(1)}%`, 50 + barWidth/2 - 15, barY + 5);
      
      doc.moveDown(2);
      
      // Status badge
      let statusColor = colors.warning;
      let statusText = 'Pending Review';
      let statusIcon = '⏳';
      
      if (report.status === 'reviewed') {
        statusColor = colors.success;
        statusText = 'Approved';
        statusIcon = '✅';
      } else if (report.status === 'needs_revision') {
        statusColor = colors.danger;
        statusText = 'Needs Revision';
        statusIcon = '🔄';
      }
      
      doc.rect(50, doc.y, 150, 30)
         .fillColor(statusColor)
         .fill();
      
      doc.fillColor(colors.white)
         .fontSize(10)
         .font('Helvetica-Bold')
         .text(`${statusIcon} ${statusText}`, 60, doc.y + 8);
      
      doc.moveDown(2);
      
      // Learning Outcomes
      if (report.outcomes) {
        doc.font('Helvetica-Bold')
           .fillColor(colors.primary)
           .text('🎯 Learning Outcomes', 50, doc.y);
        doc.moveDown(0.3);
        
        doc.font('Helvetica')
           .fontSize(9)
           .fillColor(colors.dark)
           .text(report.outcomes, 60, doc.y, {
             width: 490,
             align: 'justify'
           });
        doc.moveDown(1);
      }
      
      // Recommendations
      if (report.recommendations) {
        doc.font('Helvetica-Bold')
           .fillColor(colors.primary)
           .text('💡 Recommendations', 50, doc.y);
        doc.moveDown(0.3);
        
        doc.font('Helvetica')
           .fontSize(9)
           .fillColor(colors.dark)
           .text(report.recommendations, 60, doc.y, {
             width: 490,
             align: 'justify'
           });
        doc.moveDown(1);
      }
      
      // PRL Feedback box
      if (report.prlFeedback) {
        const feedbackY = doc.y;
        doc.rect(50, feedbackY, 500, 50)
           .fillColor('#eff6ff')
           .fill()
           .strokeColor(colors.primary)
           .lineWidth(1)
           .stroke();
        
        doc.font('Helvetica-Bold')
           .fontSize(9)
           .fillColor(colors.primary)
           .text('📝 PRL Feedback', 60, feedbackY + 8);
        
        doc.font('Helvetica')
           .fontSize(9)
           .fillColor(colors.dark)
           .text(report.prlFeedback, 60, feedbackY + 25, {
             width: 470,
             align: 'justify'
           });
        
        doc.moveDown(2);
      }
      
      // Revision Notes box
      if (report.revisionNotes) {
        const revisionY = doc.y;
        doc.rect(50, revisionY, 500, 50)
           .fillColor('#fef2f2')
           .fill()
           .strokeColor(colors.danger)
           .lineWidth(1)
           .stroke();
        
        doc.font('Helvetica-Bold')
           .fontSize(9)
           .fillColor(colors.danger)
           .text('🔄 Revision Notes', 60, revisionY + 8);
        
        doc.font('Helvetica')
           .fontSize(9)
           .fillColor(colors.dark)
           .text(report.revisionNotes, 60, revisionY + 25, {
             width: 470,
             align: 'justify'
           });
        
        doc.moveDown(2);
      }
      
      // Separator line
      doc.strokeColor(colors.border)
         .lineWidth(0.5)
         .moveTo(50, doc.y)
         .lineTo(550, doc.y)
         .stroke();
      
      doc.moveDown(1);
    });
    
    // ==================== FOOTER WITH PAGE NUMBERS ====================
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      
      // Footer line
      doc.strokeColor(colors.border)
         .lineWidth(0.5)
         .moveTo(50, doc.page.height - 40)
         .lineTo(550, doc.page.height - 40)
         .stroke();
      
      // Footer text
      doc.fontSize(8)
         .font('Helvetica')
         .fillColor(colors.gray)
         .text(
           'Lecture Report System • Quality Assurance Document',
           50,
           doc.page.height - 35,
           { align: 'center', width: 500 }
         );
      
      doc.fontSize(8)
         .text(
           `Page ${i + 1} of ${pageCount}`,
           50,
           doc.page.height - 25,
           { align: 'center', width: 500 }
         );
      
      // Add timestamp on first page footer
      if (i === 0) {
        doc.fontSize(7)
           .text(
             `Generated: ${new Date().toLocaleString()} | Report ID: LRS-${Date.now()}`,
             50,
             doc.page.height - 15,
             { align: 'center', width: 500 }
           );
      }
    }
    
  
    doc.end();
    console.log('Beautiful PDF generated successfully');
    
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