// controllers/lessonController.js
const Lesson = require('../models/lessonModel');
const Teacher = require('../models/teacherModel');
const factory = require('./handlerFactory');

exports.createLesson = factory.createOne(Lesson);

// Bulk create lessons for multiple days with optional validity window
exports.createLessonGroup = async (req, res) => {
  const {
    name,
    days = [],
    startTime,
    endTime,
    subject,
    classId,
    teacher,
    validFrom,
    validTo,
  } = req.body;
  if (!Array.isArray(days) || days.length === 0) {
    return res
      .status(400)
      .json({ status: 'error', message: 'Provide one or more days' });
  }
  if (!name || !startTime || !endTime || !subject || !classId || !teacher) {
    return res
      .status(400)
      .json({ status: 'error', message: 'Missing required fields' });
  }
  const groupId =
    new Date().getTime().toString(36) + Math.random().toString(36).slice(2, 8);
  const docs = days.map((day) => ({
    name,
    day,
    startTime,
    endTime,
    subject,
    classId,
    teacher,
    groupId,
    validFrom: validFrom || new Date(),
    validTo: validTo || undefined,
  }));
  try {
    const created = await Lesson.insertMany(docs);
    res.status(201).json({
      status: 'success',
      results: created.length,
      data: { data: created },
    });
  } catch (e) {
    res.status(400).json({
      status: 'error',
      message: e.message || 'Failed to create lesson group',
    });
  }
};

// Bulk delete all lessons in a group
exports.deleteLessonGroup = async (req, res) => {
  const { groupId } = req.params;
  if (!groupId)
    return res
      .status(400)
      .json({ status: 'error', message: 'groupId is required' });
  const result = await Lesson.deleteMany({ groupId });
  res
    .status(200)
    .json({ status: 'success', data: { deletedCount: result.deletedCount } });
};

// Bulk update group's validity window (validFrom/validTo)
exports.updateLessonGroupValidity = async (req, res) => {
  const { groupId } = req.params;
  const { validFrom, validTo } = req.body || {};
  if (!groupId)
    return res
      .status(400)
      .json({ status: 'error', message: 'groupId is required' });
  if (typeof validFrom === 'undefined' && typeof validTo === 'undefined') {
    return res.status(400).json({
      status: 'error',
      message: 'Provide validFrom and/or validTo to update',
    });
  }

  try {
    if (validFrom && validTo) {
      const vf = new Date(validFrom);
      const vt = new Date(validTo);
      if (vt < vf) {
        return res.status(400).json({
          status: 'error',
          message: 'validTo must be after validFrom',
        });
      }
    }

    const update = {};
    if (typeof validFrom !== 'undefined') update.validFrom = validFrom;
    if (typeof validTo !== 'undefined') update.validTo = validTo;

    const result = await Lesson.updateMany({ groupId }, { $set: update });

    res.status(200).json({
      status: 'success',
      data: {
        matchedCount: result.matchedCount ?? result.nMatched,
        modifiedCount: result.modifiedCount ?? result.nModified,
      },
    });
  } catch (e) {
    res.status(400).json({
      status: 'error',
      message: e.message || 'Failed to update group validity',
    });
  }
};

exports.getAllLessons = factory.getAll(
  Lesson,
  [
    { path: 'subject', select: 'name' },
    {
      path: 'classId',
      select: 'name grade',
      populate: { path: 'grade', select: 'name' },
    },
    { path: 'teacher', select: 'name' },
  ],
  // Keep list payload small
  'name subject classId teacher day startTime endTime groupId validFrom validTo',
);

exports.getLessonById = factory.getOne(Lesson, [
  { path: 'subject', select: 'name' },
  {
    path: 'classId',
    select: 'name grade',
    populate: { path: 'grade', select: 'name' },
  },
  { path: 'teacher', select: 'name' },
]);

exports.updateLesson = factory.updateOne(Lesson);
exports.deleteLesson = factory.deleteOne(Lesson);
exports.getLessonsByTeacher = async (req, res, next) => {
  try {
    // Check if user is a teacher
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Only teachers can access this endpoint.',
      });
    }

    // Find the teacher profile using the user ID
    const teacher = await Teacher.findOne({ userId: req.user.id });
    if (!teacher) {
      return res.status(404).json({
        status: 'error',
        message: 'Teacher profile not found.',
      });
    }

    const lessons = await Lesson.find({ teacher: teacher._id })
      .select(
        'name subject classId teacher day startTime endTime groupId validFrom validTo',
      )
      .populate({ path: 'subject', select: 'name' })
      .populate({
        path: 'classId',
        select: 'name grade',
        populate: { path: 'grade', select: 'name' },
      })
      .populate({ path: 'teacher', select: 'name' })
      .lean();

    res.status(200).json({
      status: 'success',
      results: lessons.length,
      data: {
        data: lessons,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch teacher lessons',
    });
  }
};
