const express = require('express');
const financialReportController = require('../controllers/financialReportController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all routes
router.use(authController.protect);

// Financial dashboard
router.get(
  '/dashboard',
  authController.restrictTo('finance_admin', 'school_admin', 'super_admin'),
  financialReportController.getFinancialDashboard,
);

// Detailed financial reports
router.get(
  '/detailed',
  authController.restrictTo('finance_admin', 'school_admin', 'super_admin'),
  financialReportController.getDetailedReport,
);

// Financial analytics
router.get(
  '/analytics',
  authController.restrictTo('finance_admin', 'school_admin', 'super_admin'),
  financialReportController.getFinancialAnalytics,
);

module.exports = router;
