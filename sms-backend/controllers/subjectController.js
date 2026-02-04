// controllers/subjectController.js
const Subject = require('../models/subjectModel');
const Teacher = require('../models/teacherModel');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');

// Optional: populate teachers and lessons
exports.getAllSubjects = factory.getAll(
  Subject,
  [
    { path: 'teachers', select: 'name surname userId' },
    { path: 'lessons', select: 'title date' },
  ],
  // Select only essential fields for list views (include capacity for UI display)
  'name grade status credits enrolled capacity room',
);

exports.getSubject = factory.getOne(Subject, [
  { path: 'teachers', select: 'name surname userId' },
  { path: 'lessons', select: 'title date' },
]);

// Create subject and sync teacher.subjects references
exports.createSubject = catchAsync(async (req, res, next) => {
  const doc = await Subject.create(req.body);

  const teacherIds = Array.isArray(doc.teachers)
    ? doc.teachers.map((t) => String(t))
    : [];
  if (teacherIds.length > 0) {
    await Teacher.updateMany(
      { _id: { $in: teacherIds } },
      { $addToSet: { subjects: doc._id } },
    );
  }

  res.status(201).json({ status: 'success', data: { data: doc } });
});

// Update subject and keep inverse Teacher.subjects in sync
exports.updateSubject = catchAsync(async (req, res, next) => {
  const subjectId = req.params.id;
  const prev = await Subject.findById(subjectId).select('teachers');
  if (!prev) {
    return res
      .status(404)
      .json({ status: 'fail', message: 'No subject found with that ID' });
  }

  const updated = await Subject.findByIdAndUpdate(subjectId, req.body, {
    new: true,
    runValidators: true,
  });

  const oldSet = new Set((prev.teachers || []).map((t) => String(t)));
  const newSet = new Set((updated.teachers || []).map((t) => String(t)));

  const added = [...newSet].filter((id) => !oldSet.has(id));
  const removed = [...oldSet].filter((id) => !newSet.has(id));

  if (added.length > 0) {
    await Teacher.updateMany(
      { _id: { $in: added } },
      { $addToSet: { subjects: updated._id } },
    );
  }
  if (removed.length > 0) {
    await Teacher.updateMany(
      { _id: { $in: removed } },
      { $pull: { subjects: updated._id } },
    );
  }

  res.status(200).json({ status: 'success', data: { data: updated } });
});

// Delete subject and remove from Teacher.subjects arrays
exports.deleteSubject = catchAsync(async (req, res, next) => {
  const subjectId = req.params.id;
  const existing = await Subject.findById(subjectId).select('_id');
  if (!existing) {
    return res
      .status(404)
      .json({ status: 'fail', message: 'No subject found with that ID' });
  }

  await Teacher.updateMany(
    { subjects: subjectId },
    { $pull: { subjects: subjectId } },
  );

  await Subject.findByIdAndDelete(subjectId);
  res.status(204).json({ status: 'success', data: null });
});

// Maintenance: reconcile Teacher.subjects based on Subject.teachers
exports.reconcileTeacherSubjects = catchAsync(async (req, res, next) => {
  const subjects = await Subject.find({}).select('teachers');
  // Clear all teacher.subjects
  await Teacher.updateMany({}, { $set: { subjects: [] } });
  // Rebuild from subjects
  for (const subj of subjects) {
    const tIds = (subj.teachers || []).map((t) => t.toString());
    if (tIds.length > 0) {
      await Teacher.updateMany(
        { _id: { $in: tIds } },
        { $addToSet: { subjects: subj._id } },
      );
    }
  }
  res.status(200).json({ status: 'success', data: { updated: true } });
});
