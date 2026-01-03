const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');
const attendanceController = require('../controllers/attendanceController');
const leaveController = require('../controllers/leaveController');
const employeeController = require('../controllers/employeeController');
const salaryController = require('../controllers/salaryController');
const upload = require('../middleware/uploadMiddleware'); // Assuming upload middleware is defined here
const { authenticate, authorize } = require('../middleware/authMiddleware');

const notificationController = require('../controllers/notificationController');

// Auth Routes
// router.post('/auth/register', authController.register); // Removed (Method missing)
router.post('/auth/login', authController.login);

// Notifications
router.get('/notifications', authenticate, notificationController.getNotifications);
router.put('/notifications/clear', authenticate, notificationController.clearAll);
router.post('/auth/create-hr', authenticate, authController.createHR); // New
router.post('/auth/change-password', authenticate, authController.changePassword); // New
router.post('/auth/send-otp', authController.sendOTP); // New
router.post('/auth/reset-password', authController.resetPassword); // OTP Reset (Public)
router.post('/auth/signup-init', authController.signupInit); // New
router.post('/auth/signup-complete', authController.signupComplete); // New

// Dashboard Routes
// Dashboard Routes
const dashboardController = require('../controllers/dashboardController');
router.get('/dashboard', authenticate, dashboardController.getDashboardData);

// Attendance Routes
router.post('/attendance/check-in', authenticate, attendanceController.checkIn);
router.post('/attendance/check-out', authenticate, attendanceController.checkOut);
router.post('/attendance/extra-time', authenticate, attendanceController.requestExtraTime); // New
router.get('/attendance/weekly', authenticate, attendanceController.getWeeklyAttendance);
router.get('/attendance/admin/weekly', authenticate, attendanceController.getWeeklyAttendanceForAll);
router.get('/attendance/admin/export', authenticate, attendanceController.exportAttendance);
router.put('/attendance/admin/:employeeId', authenticate, attendanceController.updateAttendanceRecord); // New
router.get('/attendance/me', authenticate, attendanceController.getMyAttendance);

// Leave Routes
router.get('/leaves/me', authenticate, leaveController.getMyLeaves);
router.get('/leaves/balance', authenticate, leaveController.getBalances);
router.post('/leaves/request', authenticate, upload.single('attachment'), leaveController.createRequest);
router.get('/leaves/admin/all', authenticate, leaveController.getAllLeaves); // New
router.put('/leaves/admin/:id/approve', authenticate, leaveController.approveRequest); // New
router.put('/leaves/admin/:id/reject', authenticate, leaveController.rejectRequest); // New

// Employee Profile Management (Admin/HR/Manager)
router.get('/employees/:id', authenticate, employeeController.getEmployeeProfile);
router.put('/employees/:id', authenticate, employeeController.updateEmployeeProfile);
router.post('/employees/:id/upload-photo', authenticate, upload.single('image'), employeeController.uploadProfilePicture);

// Salary Management (Restricted to Admin/HR inside controller)
router.get('/employees/:employeeId/salary', authenticate, salaryController.getSalaryDetails);
router.put('/employees/:employeeId/salary', authenticate, salaryController.updateSalaryDetails);

// Profile Routes
const profileRoutes = require('./profileRoutes');
router.use('/profile', profileRoutes);

// Salary Routes
router.get('/salary/me', authenticate, salaryController.getMe);

// Resume Routes
const resumeController = require('../controllers/resumeController');
router.get('/resume/me', authenticate, resumeController.getResume);
router.get('/resume/:employeeId', authenticate, resumeController.getResumeById); // NEW
router.put('/resume/me', authenticate, resumeController.updateResume);
router.post('/resume/me/upload', authenticate, resumeController.uploadResumeFile);

// Admin Routes
router.get('/admin/stats', authenticate, authorize('ADMIN', 'HR'), adminController.getAdminStats);
router.post('/admin/employees', authenticate, authorize('ADMIN', 'HR'), adminController.createEmployee);

module.exports = router;
// Force restart to apply changes
