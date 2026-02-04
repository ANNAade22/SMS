const express = require('express');
const feeAssignmentController = require('../controllers/feeAssignmentController');
const authController = require('../controllers/authController');
const countController = require('../controllers/countController');
const FeeAssignment = require('../models/feeAssignmentModel');

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

// Student/Parent specific routes (accessible by student, parent, and admins)
router.get(
  '/student/:studentId',
  authController.restrictTo(
    'student',
    'parent',
    'finance_admin',
    'school_admin',
    'super_admin',
  ),
  feeAssignmentController.getFeeAssignmentsByStudent,
);

// Restrict remaining routes to admin users only
router.use(
  authController.restrictTo(
    'finance_admin',
    'school_admin',
    'super_admin',
    'exam_admin',
  ),
);

// Fee assignment routes
router
  .route('/')
  .get(feeAssignmentController.getAllFeeAssignments)
  .post(feeAssignmentController.createFeeAssignment);

// Bulk fee assignment route
router.post('/bulk', feeAssignmentController.createBulkFeeAssignments);

// Overdue assignments
router.get('/overdue', feeAssignmentController.getOverdueAssignments);

// Generate payment reminders
router.post(
  '/generate-reminders',
  feeAssignmentController.generatePaymentReminders,
);

// Lightweight count endpoints
router
  .route('/count')
  .get(countController.buildCountHandler(FeeAssignment))
  .head(countController.buildHeadCountHandler(FeeAssignment));

router
  .route('/:id')
  .get(feeAssignmentController.getFeeAssignment)
  .patch(feeAssignmentController.updateFeeAssignment)
  .delete(feeAssignmentController.deleteFeeAssignment);

module.exports = router;
