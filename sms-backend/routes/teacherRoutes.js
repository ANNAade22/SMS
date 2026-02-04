// routes/teacherRoutes.js
const express = require('express');
const teacherController = require('../controllers/teacherController');
const countController = require('../controllers/countController');
const Teacher = require('../models/teacherModel');
const authController = require('../controllers/authController');
const sessionController = require('../controllers/sessionController');

const router = express.Router();

// Protect all teacher routes and ensure session is valid
router.use(authController.protect);
router.use(sessionController.validateSession);

// Self profile for the logged-in teacher
router.get(
  '/me',
  authController.restrictToEnhanced(
    'teacher',
    'super_admin',
    'school_admin',
    'exam_admin',
  ),
  teacherController.getMe,
);

// Get teacher's classes and subjects for assignment creation
router.get(
  '/classes-and-subjects',
  authController.restrictToEnhanced(
    'teacher',
    'super_admin',
    'school_admin',
    'exam_admin',
  ),
  teacherController.getTeacherClassesAndSubjects,
);

router.route('/').get(teacherController.getAllTeachers).post(
  // authController.restrictTo('admin'),
  teacherController.createOrLinkTeacher,
);

// Lightweight count endpoints
router
  .route('/count')
  .get(countController.buildCountHandler(Teacher))
  .head(countController.buildHeadCountHandler(Teacher));

// router.get('/by-class', teacherController.getTeachersByClassId);
router
  .route('/:id')
  .get(
    // authController.restrictTo('admin', 'teacher'),
    teacherController.getTeacher,
  )
  .patch(
    // authController.restrictTo('admin'),
    teacherController.updateTeacher,
  )
  .delete(
    // authController.restrictTo('admin'),
    teacherController.deleteTeacher,
  );

module.exports = router;
