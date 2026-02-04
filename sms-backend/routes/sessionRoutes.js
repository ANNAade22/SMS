const express = require('express');
const sessionController = require('./../controllers/sessionController');
const authController = require('./../controllers/authController');

const router = express.Router();

// Protect all routes
router.use(authController.protect);

// Get my active sessions
router.get('/my-sessions', sessionController.getMySessions);

// Get all active sessions (admin only)
router.get(
  '/all',
  authController.restrictToEnhanced('super_admin', 'it_admin'),
  sessionController.getAllActiveSessions,
);

// Get sessions by userId (admin only)
router.get(
  '/',
  authController.restrictToEnhanced('super_admin', 'it_admin'),
  sessionController.getSessionsByUserId,
);
// Admin + IT + School admin can view only admins & teachers subset
router.get(
  '/staff',
  authController.restrictToEnhanced('super_admin', 'it_admin', 'school_admin'),
  sessionController.getAdminTeacherSessions,
);

// Invalidate specific session
router.delete('/:sessionId', sessionController.invalidateSession);

// Invalidate all my sessions
router.delete('/my-sessions/all', sessionController.invalidateAllMySessions);

// Invalidate all sessions for a user (admin only)
router.delete(
  '/user/:userId/all',
  authController.restrictToEnhanced('super_admin', 'it_admin'),
  sessionController.invalidateUserSessions,
);

// Clean expired sessions (admin only)
router.delete(
  '/expired/clean',
  authController.restrictToEnhanced('super_admin', 'it_admin'),
  sessionController.cleanExpiredSessions,
);

// Get session statistics (admin only)
router.get(
  '/stats',
  authController.restrictToEnhanced('super_admin', 'school_admin', 'it_admin'),
  sessionController.getSessionStats,
);

module.exports = router;
