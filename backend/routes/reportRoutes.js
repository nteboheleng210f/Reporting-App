const express = require('express');
const router = express.Router();
const { 
  createReport, 
  getReports, 
  getMyReports,
  updateReportFeedback, 
  getPendingReports, 
  getReviewedReports, 
  exportSingleReportToExcel,
  exportSingleReportToPDF,
  exportAllReportsToExcel,
  exportAllReportsToPDF,
  exportRatingsToExcel
} = require('../controllers/reportController');

router.get('/', getReports);
router.get('/pending', getPendingReports);
router.get('/reviewed', getReviewedReports);
router.get('/my', getMyReports);
router.get('/export/all/excel', exportAllReportsToExcel);
router.get('/export/all/pdf', exportAllReportsToPDF);
router.get('/export/:reportId/excel', exportSingleReportToExcel);
router.get('/export/:reportId/pdf', exportSingleReportToPDF);
router.post('/', createReport);
router.put('/:reportId/feedback', updateReportFeedback);

module.exports = router;