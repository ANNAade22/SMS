const Class = require('../models/classModel');
const factory = require('./handlerFactory');

exports.createClass = factory.createOne(Class);
exports.updateClass = factory.updateOne(Class);
exports.deleteClass = factory.deleteOne(Class);

// Simple getAllClasses without complex population
exports.getAllClasses = async (req, res, next) => {
  try {
    const classes = await Class.find()
      .populate('supervisor', 'name surname')
      .populate('grade', 'name')
      .select('_id name capacity grade supervisor students')
      .lean();

    res.status(200).json({
      status: 'success',
      results: classes.length,
      data: {
        data: classes,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getClass = factory.getOne(Class);
