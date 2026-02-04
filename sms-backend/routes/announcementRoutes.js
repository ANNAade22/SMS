const express = require('express');
const announcementController = require('../controllers/announcementController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all routes
router.use(authController.protect);

// Routes for all authenticated users
router.get('/audience-options', announcementController.getAudienceOptions);

// CRUD routes
router
  .route('/')
  .get(announcementController.getAllAnnouncements)
  .post(announcementController.createAnnouncement);

router
  .route('/:id')
  .get(announcementController.getAnnouncement)
  .patch(announcementController.updateAnnouncement)
  .delete(announcementController.deleteAnnouncement);

// Special route for toggling pin status
router.patch('/:id/toggle-pin', announcementController.togglePin);

module.exports = router;
