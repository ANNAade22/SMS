const Grade = require('../models/gradeModel');

exports.getAllGrades = async (req, res) => {
  try {
    const grades = await Grade.find().select('name');
    res.status(200).json({
      status: 'success',
      results: grades.length,
      data: { grades },
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};
