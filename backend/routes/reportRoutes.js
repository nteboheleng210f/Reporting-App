const express = require('express');
const router = express.Router();
const { 
  createReport, 
  getReports, 
  getMyReports,
  updateReportFeedback, 
  getPendingReports, 
  getReviewedReports, 
  exportReportsToExcel,
  exportReportsToPDF  // This will now work
} = require('../controllers/reportController');

router.get('/', getReports);
router.get('/pending', getPendingReports);
router.get('/reviewed', getReviewedReports);
router.get('/my', getMyReports);
router.get('/export', exportReportsToExcel);
router.get('/export/pdf', exportReportsToPDF);  // This will now work
router.post('/', createReport);
router.put('/:reportId/feedback', updateReportFeedback);

module.exports = router;