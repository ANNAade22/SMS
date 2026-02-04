// routes/parentRoutes.js
const express = require('express');
const parentController = require('../controllers/parentController');
const countController = require('../controllers/countController');
const Parent = require('../models/parentModel');

const router = express.Router();

router
  .route('/')
  .get(parentController.getAllParents)
  .post(parentController.createOrLinkParent);

// Get current parent's children
router.get('/my-children', parentController.getMyChildren);

// Assign existing students to a parent
router.post('/:id/assign-students', parentController.assignStudents);

// Lightweight count endpoints
router
  .route('/count')
  .get(countController.buildCountHandler(Parent))
  .head(countController.buildHeadCountHandler(Parent));

router
  .route('/:id')
  .get(parentController.getParent)
  .patch(parentController.updateParent)
  .delete(parentController.deleteParent);

module.exports = router;
