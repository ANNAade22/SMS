// routes/studentRoutes.js
const express = require('express');
const studentController = require('../controllers/studentController');
const authController = require('../controllers/authController');
const countController = require('../controllers/countController');
const Student = require('../models/studentModel');

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

// Special route for parents to get their children - no role restriction
router.get('/my-children', studentController.getMyChildren);

// Special route for teachers to get their students - no role restriction
router.get('/my-students', studentController.getMyStudents);

// Special route for students to get and update their own profile - no role restriction
router
  .route('/my-profile')
  .get(studentController.getMyProfile)
  .patch(studentController.updateMyProfile);

// Lightweight count endpoints - accessible to all authenticated users
router
  .route('/count')
  .get(countController.buildCountHandler(Student))
  .head(countController.buildHeadCountHandler(Student));

// Restrict to admin users only for other routes
router.use(
  authController.restrictTo(
    'finance_admin',
    'school_admin',
    'super_admin',
    'exam_admin',
  ),
);

router
  .route('/')
  .get(studentController.getAllStudents)
  .post(
    authController.checkPermission('manage_student_records'),
    studentController.createOrLinkStudent,
  );

// Bulk preflight and creation endpoints
router.post(
  '/bulk/preflight',
  authController.checkPermission('manage_student_records'),
  studentController.bulkPreflightStudents,
);
router.post(
  '/bulk',
  authController.checkPermission('manage_student_records'),
  studentController.bulkCreateStudents,
);

router
  .route('/:id')
  .get(studentController.getStudent)
  .patch(
    authController.checkPermission('manage_student_records'),
    studentController.updateStudent,
  )
  .delete(
    authController.checkPermission('manage_student_records'),
    studentController.deleteStudent,
  );

module.exports = router;
