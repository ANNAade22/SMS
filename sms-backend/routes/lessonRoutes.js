// routes/lessonRoutes.js
const express = require('express');
const lessonController = require('../controllers/lessonController');
const authController = require('../controllers/authController');

const router = express.Router();

router
  .route('/')
  .post(lessonController.createLesson)
  .get(lessonController.getAllLessons);

// Bulk group operations
router.route('/groups').post(lessonController.createLessonGroup);

router
  .route('/groups/:groupId')
  .delete(lessonController.deleteLessonGroup)
  .patch(lessonController.updateLessonGroupValidity);

router
  .route('/my-lessons')
  .get(authController.protect, lessonController.getLessonsByTeacher);

router
  .route('/:id')
  .get(lessonController.getLessonById)
  .patch(lessonController.updateLesson)
  .delete(lessonController.deleteLesson);

module.exports = router;
