const express = require('express');
const securityController = require('./../controllers/securityController');
const authController = require('./../controllers/authController');

const router = express.Router();

// Protect all routes
router.use(authController.protect);

// Security events
router.get(
  '/events',
  authController.restrictToEnhanced('super_admin', 'it_admin'),
  securityController.getSecurityEvents,
);

router.get(
  '/events/high-risk',
  authController.restrictToEnhanced('super_admin', 'it_admin'),
  securityController.getHighRiskEvents,
);

router.patch(
  '/events/:id/resolve',
  authController.restrictToEnhanced('super_admin', 'it_admin'),
  securityController.resolveSecurityEvent,
);

// Security statistics
router.get(
  '/stats',
  authController.restrictToEnhanced('super_admin', 'school_admin', 'it_admin'),
  securityController.getSecurityStats,
);

// Password policies
router.get(
  '/password-policies',
  authController.restrictToEnhanced('super_admin', 'it_admin'),
  securityController.getPasswordPolicies,
);

router.post(
  '/password-policies',
  authController.restrictToEnhanced('super_admin', 'it_admin'),
  securityController.createPasswordPolicy,
);

router.patch(
  '/password-policies/:id',
  authController.restrictToEnhanced('super_admin', 'it_admin'),
  securityController.updatePasswordPolicy,
);

// Password validation
router.post('/validate-password', securityController.validatePassword);

module.exports = router;
