const express = require('express');
const paymentController = require('../controllers/paymentController');
const authController = require('../controllers/authController');
const countController = require('../controllers/countController');
const Payment = require('../models/paymentModel');

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
  paymentController.getPaymentsByStudent,
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

// Payment routes
router
  .route('/')
  .get(paymentController.getAllPayments)
  .post(paymentController.createPayment);

// Payment statistics
router.get('/statistics', paymentController.getPaymentStatistics);

// Lightweight count endpoints
router
  .route('/count')
  .get(countController.buildCountHandler(Payment))
  .head(countController.buildHeadCountHandler(Payment));

router
  .route('/:id')
  .get(paymentController.getPayment)
  .patch(paymentController.updatePayment)
  .delete(paymentController.deletePayment);

module.exports = router;
