// routes/subjectRoutes.js
const express = require('express');
const subjectController = require('../controllers/subjectController');
const countController = require('../controllers/countController');
const Subject = require('../models/subjectModel');
const authController = require('../controllers/authController');

const router = express.Router();

// Admin maintenance: reconcile Teacher.subjects from Subject.teachers
router.post(
  '/reconcile-teacher-subjects',
  // authController.protect,
  // authController.restrictTo('admin'),
  subjectController.reconcileTeacherSubjects,
);

router
  .route('/')
  .get(
    // authController.protect,
    // authController.restrictTo('admin', 'teacher'),
    subjectController.getAllSubjects,
  )
  .post(
    // authController.protect,
    // authController.restrictTo('admin'),
    subjectController.createSubject,
  );

// Lightweight count endpoints
router
  .route('/count')
  .get(countController.buildCountHandler(Subject))
  .head(countController.buildHeadCountHandler(Subject));

router
  .route('/:id')
  .get(
    // authController.protect,
    // authController.restrictTo('admin', 'teacher'),
    subjectController.getSubject,
  )
  .patch(
    // authController.protect,
    // authController.restrictTo('admin'),
    subjectController.updateSubject,
  )
  .delete(
    // authController.protect,
    // authController.restrictTo('admin'),
    subjectController.deleteSubject,
  );

module.exports = router;
