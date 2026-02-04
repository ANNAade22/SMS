const express = require('express');
const gradeController = require('../controllers/gradeController');

const router = express.Router();

router.route('/').get(gradeController.getAllGrades);

module.exports = router;
