const express = require('express');
const paymentReminderController = require('../controllers/paymentReminderController');
const authController = require('../controllers/authController');
const countController = require('../controllers/countController');
const PaymentReminder = require('../models/paymentReminderModel');

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

// Payment reminder routes
router.route('/').get(paymentReminderController.getAllPaymentReminders);

// Reminder statistics
router.get('/statistics', paymentReminderController.getReminderStatistics);

// Active reminders for student (for login popup) - accessible by student/parent
router.get(
  '/student/:studentId/active',
  authController.restrictTo(
    'student',
    'parent',
    'finance_admin',
    'school_admin',
    'super_admin',
  ),
  paymentReminderController.getActiveReminders,
);

// Payment reminders by student - accessible by student/parent
router.get(
  '/student/:studentId',
  authController.restrictTo(
    'student',
    'parent',
    'finance_admin',
    'school_admin',
    'super_admin',
  ),
  paymentReminderController.getPaymentRemindersByStudent,
);

// Mark all reminders as read for student
router.patch(
  '/student/:studentId/mark-all-read',
  paymentReminderController.markAllRemindersAsRead,
);

// Lightweight count endpoints
router
  .route('/count')
  .get(countController.buildCountHandler(PaymentReminder))
  .head(countController.buildHeadCountHandler(PaymentReminder));

router
  .route('/:id')
  .get(paymentReminderController.getPaymentReminder)
  .patch(paymentReminderController.markReminderAsRead)
  .delete(paymentReminderController.dismissReminder);

// Dismiss reminder
router.patch('/:id/dismiss', paymentReminderController.dismissReminder);

// NEW: Automated reminder routes
router.post(
  '/automated',
  authController.restrictTo('finance_admin', 'school_admin', 'super_admin'),
  paymentReminderController.createAutomatedReminders,
);

router.post(
  '/bulk',
  authController.restrictTo('finance_admin', 'school_admin', 'super_admin'),
  paymentReminderController.createBulkReminders,
);

router.get(
  '/analytics',
  authController.restrictTo('finance_admin', 'school_admin', 'super_admin'),
  paymentReminderController.getReminderAnalytics,
);

module.exports = router;
