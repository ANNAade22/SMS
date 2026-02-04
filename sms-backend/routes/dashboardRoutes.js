// routes/dashboardRoutes.js
const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all dashboard routes
router.use(authController.protect);

// Recent activities
router.get('/activities', dashboardController.getRecentActivities);

// User statistics by role
router.get('/user-stats', dashboardController.getUserStats);

// Class distribution
router.get('/class-distribution', dashboardController.getClassDistribution);

// Performance metrics
router.get('/performance', dashboardController.getPerformanceMetrics);

// Attendance overview
router.get('/attendance-overview', dashboardController.getAttendanceOverview);

module.exports = router;
