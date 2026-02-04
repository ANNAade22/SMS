const express = require('express');
const semesterController = require('../controllers/semesterController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all routes
router.use(authController.protect);

// Restrict to admin roles only
router.use(
  authController.restrictTo(
    'super_admin',
    'school_admin',
    'academic_admin',
    'exam_admin',
  ),
);

// Semester management routes
router
  .route('/')
  .get(semesterController.getAllSemesters)
  .post(semesterController.createSemester);

router.route('/current').get(semesterController.getCurrentSemester);

router.route('/close-current').post(semesterController.closeCurrentSemester);

router.route('/start-new').post(semesterController.startNewSemester);

router.route('/:id').patch(semesterController.updateSemester);

router
  .route('/:semester/:academicYear/stats')
  .get(semesterController.getSemesterStats);

router.route('/student/:studentId/cgpa').get(semesterController.getStudentCGPA);

module.exports = router;
