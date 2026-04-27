const express = require('express');
const router = express.Router();
const { 
  createReport, 
  getReports, 
  updateReportFeedback, 
  getPendingReports, 
  getReviewedReports,
  exportReportsToExcel
} = require('../controllers/reportController');

router.get('/', getReports);
router.get('/pending', getPendingReports);
router.get('/reviewed', getReviewedReports);
router.get('/export', exportReportsToExcel);  // Add this line
router.post('/', createReport);
router.put('/:reportId/feedback', updateReportFeedback);

module.exports = router;