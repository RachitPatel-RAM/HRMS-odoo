const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Get My Profile
router.get('/me', authenticate, profileController.getMe);

// Get Any Profile (Admin/HR only)
router.get('/:employeeId', authenticate, authorize('ADMIN', 'HR'), profileController.getEmployeeProfile);

// Update My Profile
router.put('/me', authenticate, profileController.updateMe);

// Update Any Profile (Admin/HR only)
router.put('/:employeeId', authenticate, authorize('ADMIN', 'HR'), profileController.updateEmployeeProfile);

// Upload Avatar
router.post('/avatar', authenticate, profileController.uploadAvatar);

// Get History
router.get('/history/:section', authenticate, profileController.getHistory);

module.exports = router;
