const express = require('express');
const rateLimit = require('express-rate-limit');
const userController = require('./../controllers/userController');
const authController = require('./../controllers/authController');
const sessionController = require('./../controllers/sessionController');
const countController = require('../controllers/countController');
const User = require('../models/userModel');

const router = express.Router();

// Public routes
router.post('/signup', authController.signup);
router.post('/login', authController.logLoginAttempt, authController.login);
router.post('/refresh', authController.refresh);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);
// Rate limit for first password setup attempts
const firstPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'fail', message: 'Too many attempts, try later.' },
});
// First-time password setup (restricted token)
router.post(
  '/first-password',
  firstPasswordLimiter,
  authController.firstPasswordSetup,
);

// Public user count (could restrict later). Supports filters: role, department
router
  .route('/count')
  .get(countController.buildCountHandler(User))
  .head(countController.buildHeadCountHandler(User));

// Protected routes
router.use(authController.protect); // All routes below require authentication
router.use(authController.checkAccountStatus); // Check if account is active and not locked
// Validate session and update activity for authenticated requests
router.use(sessionController.validateSession);
router.use(sessionController.updateSessionActivity);

// Password management
router.patch('/updateMyPassword', authController.updatePassword);

// User profile management
router.patch('/updateMe', userController.updateMe);
router.delete('/deleteMe', userController.deleteMe);
router.get('/me', userController.getMe, userController.getUser);
router.post('/logout', authController.logout);
router.post('/logoutAll', authController.logoutAll);

// On-demand CSRF token rotation (GET is a safe method so no CSRF required itself)
router.get('/csrf', (req, res, next) => {
  // Require authentication to obtain/rotate CSRF token
  if (!req.user) {
    return res
      .status(401)
      .json({ status: 'fail', message: 'Unauthorized (no user attached)' });
  }
  const token = res.issueCsrfToken ? res.issueCsrfToken() : null;
  return res.status(200).json({ status: 'success', token });
});

// User activities and stats
router.get('/activities', userController.getUserActivities);
router.get(
  '/:userId/activities',
  authController.restrictToEnhanced('super_admin', 'it_admin'),
  userController.getUserActivities,
);
router.get('/stats', userController.getUserStats);

// Admin management routes
router.get(
  '/admins',
  authController.restrictToEnhanced(
    'super_admin',
    'school_admin',
    'it_admin',
    'academic_admin',
    'exam_admin',
    'finance_admin',
    'student_affairs_admin',
  ),
  userController.getAdminsByRole,
);

router.delete(
  '/admins/:id',
  authController.restrictToEnhanced('super_admin', 'school_admin'),
  userController.deleteAdmin,
);

// Admin only routes
router.post(
  '/',
  authController.restrictToEnhanced('super_admin', 'school_admin', 'it_admin'),
  userController.createUserAdmin,
);
router.get(
  '/',
  authController.restrictToEnhanced(
    'super_admin',
    'school_admin',
    'it_admin',
    'exam_admin',
  ),
  userController.getAllUsers,
);

router.get(
  '/:id',
  authController.restrictToEnhanced('super_admin', 'school_admin', 'it_admin'),
  userController.getUser,
);

// Admin regenerate first-login token (must be before generic :id patch/delete if path conflicts arise)
router.post(
  '/:id/first-password-token',
  authController.restrictToEnhanced('super_admin', 'school_admin', 'it_admin'),
  authController.regenerateFirstLoginToken,
);

router.patch(
  '/:id',
  authController.restrictToEnhanced('super_admin', 'school_admin', 'it_admin'),
  userController.updateUser,
);

router.delete(
  '/:id',
  authController.restrictToEnhanced('super_admin', 'school_admin', 'it_admin'),
  userController.deleteUser,
);

// Department-specific routes
router.get(
  '/department/:department',
  authController.restrictToEnhanced('super_admin', 'school_admin'),
  userController.getUsersByDepartment,
);

// Permission-based routes
router.post(
  '/permissions/grant',
  authController.restrictToEnhanced('super_admin', 'school_admin', 'it_admin'),
  userController.grantPermission,
);

router.post(
  '/permissions/revoke',
  authController.restrictToEnhanced('super_admin', 'school_admin', 'it_admin'),
  userController.revokePermission,
);

module.exports = router;
