const express = require('express');
const classController = require('../controllers/classController');
const countController = require('../controllers/countController');
const Class = require('../models/classModel');

const router = express.Router();

router
  .route('/')
  .get(classController.getAllClasses)
  .post(classController.createClass);

// Lightweight count endpoints
router
  .route('/count')
  .get(countController.buildCountHandler(Class))
  .head(countController.buildHeadCountHandler(Class));

router
  .route('/:id')
  .get(classController.getClass)
  .patch(classController.updateClass)
  .delete(classController.deleteClass);

module.exports = router;
