const express = require('express');
const router = express.Router();
const { 
  createReport, 
  getReports, 
  getMyReports,
  getReportsPaginated,        
  getPendingReportsPaginated, 
  updateReportFeedback, 
  getPendingReports, 
  getReviewedReports, 
  exportReportsToExcel,
  submitStructuredFeedback    
} = require('../controllers/reportController');
const { getUserFromHeader, checkRole } = require('../middleware/auth');

router.use(getUserFromHeader);


router.get('/paginated', checkRole(['pl', 'prl']), getReportsPaginated);
router.get('/pending/paginated', checkRole(['prl']), getPendingReportsPaginated);


router.get('/', getReports);
router.get('/pending', getPendingReports);
router.get('/reviewed', getReviewedReports);
router.get('/my', getMyReports);
router.get('/export', exportReportsToExcel);
router.post('/', checkRole(['lecturer']), createReport);
router.put('/:reportId/feedback', checkRole(['prl']), updateReportFeedback);
router.post('/:reportId/structured-feedback', checkRole(['prl']), submitStructuredFeedback); // NEW

module.exports = router;