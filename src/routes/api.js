const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Auth Routes
router.post('/auth/login', authController.login);
router.post('/auth/signup-init', authController.signupInit);
router.post('/auth/signup-complete', authController.signupComplete);
router.get('/auth/verify-email', authController.verifyEmail);
router.post('/auth/reset-password', authenticate, authController.resetPassword);

// Dashboard Routes
router.get('/dashboard', authenticate, require('../controllers/dashboardController').getDashboardData);

// Attendance Routes
const attendanceController = require('../controllers/attendanceController');
router.post('/attendance/check-in', authenticate, attendanceController.checkIn);
router.post('/attendance/check-out', authenticate, attendanceController.checkOut);

// Profile Routes
const profileRoutes = require('./profileRoutes');
router.use('/profile', profileRoutes);

// Salary Routes
const salaryController = require('../controllers/salaryController');
router.get('/salary/me', authenticate, salaryController.getMe);

// Resume Routes
const resumeController = require('../controllers/resumeController');
router.get('/resume/me', authenticate, resumeController.getResume);
router.put('/resume/me', authenticate, resumeController.updateResume);
router.post('/resume/me/upload', authenticate, resumeController.uploadResumeFile);

// Admin Routes
router.post('/admin/employees', authenticate, authorize('ADMIN', 'HR'), adminController.createEmployee);

module.exports = router;
