const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  getMe, 
  getUsersByRole 
} = require('../controllers/authController');
const { authenticateToken, checkRole } = require('../middleware/auth');

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/me', authenticateToken, getMe);
router.get('/users/role/:role', authenticateToken, checkRole(['prl', 'pl']), getUsersByRole);

module.exports = router;