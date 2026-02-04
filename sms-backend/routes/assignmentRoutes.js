// routes/assignmentRoutes.js
const express = require('express');
const assignmentController = require('../controllers/assignmentController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all routes
router.use(authController.protect);

// Routes for all authenticated users
router.get('/my-assignments', assignmentController.getTeacherAssignments); // For teachers
router.get(
  '/student/my-assignments',
  assignmentController.getStudentAssignments,
); // For students
router.get('/student', assignmentController.getAssignmentsByStudentId); // For parents
router.get('/class/:classId', assignmentController.getClassAssignments); // For students/parents

// Admin and teacher routes
router
  .route('/')
  .get(assignmentController.getAllAssignments)
  .post(
    authController.restrictTo(
      'super_admin',
      'academic_admin',
      'exam_admin',
      'teacher',
    ),
    assignmentController.createAssignment,
  );

router
  .route('/:id')
  .get(assignmentController.getAssignmentById)
  .patch(
    authController.restrictTo(
      'super_admin',
      'academic_admin',
      'exam_admin',
      'teacher',
    ),
    assignmentController.updateAssignment,
  )
  .delete(
    authController.restrictTo(
      'super_admin',
      'academic_admin',
      'exam_admin',
      'teacher',
    ),
    assignmentController.deleteAssignment,
  );

// Submission routes (for students)
router.post('/:assignmentId/submit', assignmentController.submitAssignment);

// Grading routes (for teachers)
router.patch(
  '/:assignmentId/submission/:submissionId/grade',
  authController.restrictTo(
    'super_admin',
    'academic_admin',
    'exam_admin',
    'teacher',
  ),
  assignmentController.gradeSubmission,
);

// Teacher-specific routes
router.get('/teacher/:teacherId', assignmentController.getTeacherAssignments);

module.exports = router;
