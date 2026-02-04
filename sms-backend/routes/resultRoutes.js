// routes/resultRoutes.js
const express = require('express');
const resultController = require('../controllers/resultController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all routes
router.use(authController.protect);

// Student specific routes (must come before generic routes)
router.get('/student/my-results', resultController.getStudentResults);
router.post(
  '/student/seed-demo',
  authController.restrictTo('student'),
  resultController.seedMyDemoResults,
);

// Main results routes
// Admin/teacher results listing
router.get(
  '/',
  authController.restrictTo(
    'super_admin',
    'school_admin',
    'academic_admin',
    'exam_admin',
    'teacher',
  ),
  resultController.getAllResults,
);

// Admin-only create
router.post(
  '/',
  authController.restrictTo(
    'super_admin',
    'school_admin',
    'academic_admin',
    'exam_admin',
  ),
  resultController.createResult,
);

// Teacher specific routes
router.get(
  '/my-results',
  authController.restrictTo('teacher'),
  resultController.getAllResults,
); // For now, same as getAll

// Student specific routes
router.get('/student', resultController.getAllResults); // For now, same as getAll

// Get results by student ID (for parent dashboard)
router.get('/by-student', resultController.getResultsByStudentId);

router.get(
  '/:id',
  authController.restrictTo(
    'super_admin',
    'school_admin',
    'academic_admin',
    'exam_admin',
    'teacher',
  ),
  resultController.getResult,
);
router.patch(
  '/:id',
  authController.restrictTo(
    'super_admin',
    'school_admin',
    'academic_admin',
    'exam_admin',
  ),
  resultController.updateResult,
);
router.delete(
  '/:id',
  authController.restrictTo(
    'super_admin',
    'school_admin',
    'academic_admin',
    'exam_admin',
  ),
  resultController.deleteResult,
);

module.exports = router;
