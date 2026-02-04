const express = require('express');
const eventController = require('../controllers/eventController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all routes
router.use(authController.protect);

// Routes
router.get('/audience-options', eventController.getAudienceOptions);

router
  .route('/')
  .get(eventController.getAllEvents)
  .post(
    authController.restrictTo('super_admin', 'school_admin'),
    eventController.createEvent,
  );

router
  .route('/:id')
  .get(eventController.getEvent)
  .patch(
    authController.restrictTo('super_admin', 'school_admin'),
    eventController.updateEvent,
  )
  .delete(
    authController.restrictTo('super_admin', 'school_admin'),
    eventController.deleteEvent,
  );

module.exports = router;
