const express = require('express');
const router = express.Router();

const { getLecturerStats } = require('../controllers/dashboardController');



router.get('/lecturer', getLecturerStats);

module.exports = router;