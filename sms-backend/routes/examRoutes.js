// routes/examRoutes.js
const express = require('express');
const examController = require('../controllers/examController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all routes
// router.use(authController.protect);

// Routes
router
  .route('/')
  .get(examController.getAllExams)
  .post(examController.createExam);

// Teacher-specific routes MUST come before the parameterized "/:id" route
router.get('/teacher/:teacherId', examController.getTeacherExams);

// Get exams by student ID (for parent dashboard)
router.get('/student', examController.getExamsByStudentId);
router.get('/my-exams', authController.protect, examController.getTeacherExams);
router.get(
  '/student/my-exams',
  authController.protect,
  examController.getStudentExams,
);
// Seed sample exams for the current teacher (dev/test)
router.post(
  '/my-exams/seed',
  authController.protect,
  examController.seedMyExams,
);

router
  .route('/:id')
  .get(examController.getExamById)
  .patch(examController.updateExam)
  .delete(examController.deleteExam);

module.exports = router;
