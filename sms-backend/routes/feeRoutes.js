const express = require('express');
const feeController = require('../controllers/feeController');
const authController = require('../controllers/authController');
const countController = require('../controllers/countController');
const Fee = require('../models/feeModel');

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

// Restrict to admin users only
router.use(
  authController.restrictTo('finance_admin', 'school_admin', 'super_admin'),
);

// Fee routes
router.route('/').get(feeController.getAllFees).post(feeController.createFee);

// Fee statistics
router.get('/statistics', feeController.getFeeStatistics);

// Fee by category
router.get('/category/:category', feeController.getFeesByCategory);

// Assign fees to students
router.post('/assign', feeController.assignFeesToStudents);

// Lightweight count endpoints
router
  .route('/count')
  .get(countController.buildCountHandler(Fee))
  .head(countController.buildHeadCountHandler(Fee));

router
  .route('/:id')
  .get(feeController.getFee)
  .patch(feeController.updateFee)
  .delete(feeController.deleteFee);

module.exports = router;
