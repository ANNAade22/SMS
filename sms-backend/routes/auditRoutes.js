const express = require('express');
const auditController = require('../controllers/auditController');
const financialAuditLogger = require('../utils/financialAuditLogger');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all routes
router.use(authController.protect);

// Get financial audit logs
router.get(
  '/financial',
  authController.restrictTo('finance_admin', 'school_admin', 'super_admin'),
  async (req, res, next) => {
    try {
      const {
        startDate,
        endDate,
        action,
        resource,
        user,
        limit = 100,
        skip = 0,
      } = req.query;

      const result = await financialAuditLogger.getFinancialAuditLogs({
        startDate,
        endDate,
        action,
        resource,
        user,
        limit: parseInt(limit),
        skip: parseInt(skip),
      });

      res.status(200).json({
        status: 'success',
        data: {
          logs: result.logs,
          total: result.total,
          hasMore: result.hasMore,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// Get financial audit statistics
router.get(
  '/financial/stats',
  authController.restrictTo('finance_admin', 'school_admin', 'super_admin'),
  async (req, res, next) => {
    try {
      const { startDate, endDate } = req.query;

      const stats = await financialAuditLogger.getFinancialAuditStats({
        startDate,
        endDate,
      });

      res.status(200).json({
        status: 'success',
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  },
);

// Get general audit logs (existing functionality)
router.get('/', auditController.getSystemAuditLogs);
router.get('/system', auditController.getSystemAuditLogs); // Alias for monitoring
router.get('/filter-options', auditController.getFilterOptions); // Filter options
router.get('/user/:userId', auditController.getUserAuditLogs);
router.get('/department/:department', auditController.getDepartmentAuditLogs);
router.get('/stats', auditController.getAuditStats);

module.exports = router;
