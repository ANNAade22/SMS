const express = require('express');
const authController = require('../controllers/authController');
const attendanceController = require('../controllers/attendanceController');

const router = express.Router();

// Protect all attendance routes
router.use(authController.protect);

router.route('/').get(attendanceController.getAllAttendance);

module.exports = router;
