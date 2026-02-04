// controllers/parentController.js
const Parent = require('../models/parentModel');
const User = require('../models/userModel');
const factory = require('./handlerFactory');

exports.getAllParents = factory.getAll(Parent, [
  { path: 'students', select: 'name' }, // virtual populate
  { path: 'username', select: 'username' },
]);

exports.getParent = factory.getOne(Parent, [
  { path: 'students', select: 'name' },
  { path: 'username', select: 'username' },
]);

// Create or link a Parent to an existing User by username (admin flow)
exports.createOrLinkParent = async (req, res, next) => {
  try {
    const { username, name, surname, email, phone, address } = req.body || {};

    if (!username) {
      return res
        .status(400)
        .json({ status: 'fail', message: 'username is required to link' });
    }
    if (!name || !surname) {
      return res
        .status(400)
        .json({ status: 'fail', message: 'name and surname are required' });
    }
    if (!phone) {
      return res
        .status(400)
        .json({ status: 'fail', message: 'phone is required' });
    }
    if (!address) {
      return res
        .status(400)
        .json({ status: 'fail', message: 'address is required' });
    }

    // Find the user by username and validate role
    const user = await User.findOne({ username }).select(
      'id email role parentProfile',
    );
    if (!user) {
      return res
        .status(404)
        .json({ status: 'fail', message: 'User not found' });
    }
    if (user.role !== 'parent') {
      return res.status(400).json({
        status: 'fail',
        message: 'User is not a parent account',
      });
    }

    // Ensure no existing parent profile linked to this user
    const existing = await Parent.findOne({ username: user.id }).select('_id');
    if (existing) {
      return res.status(409).json({
        status: 'fail',
        message: 'Parent profile already exists for this user',
      });
    }

    const parentDoc = await Parent.create({
      name,
      surname,
      username: user.id, // link to User by ObjectId
      email: user.email, // source email from User to avoid duplicates
      phone,
      address,
    });

    // Update the User document to reference this parent profile
    await User.findByIdAndUpdate(user.id, { parentProfile: parentDoc._id });

    res.status(201).json({ status: 'success', data: { data: parentDoc } });
  } catch (e) {
    next(e);
  }
};
exports.createParent = factory.createOne(Parent);
exports.updateParent = factory.updateOne(Parent);
exports.deleteParent = factory.deleteOne(Parent);

// Long-run assignment: update Student documents only; Parent no longer stores students array
const Student = require('../models/studentModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Get current parent's children
exports.getMyChildren = catchAsync(async (req, res, next) => {
  const parentId = req.user.parentProfile;

  if (!parentId) {
    return next(new AppError('No parent profile found for this user', 404));
  }

  const Student = require('../models/studentModel');
  const students = await Student.find({ parent: parentId })
    .populate('class', 'name')
    .populate('grade', 'name')
    .select('name surname email phone class grade');

  res.status(200).json({
    status: 'success',
    data: students,
  });
});

// Assign existing students to a parent (reassign allowed via flag)
exports.assignStudents = catchAsync(async (req, res, next) => {
  const parentId = req.params.id;
  const { studentIds = [], allowReassign = true } = req.body;
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return next(new AppError('Provide non-empty studentIds array', 400));
  }

  // Validate parent exists
  const parent = await Parent.findById(parentId);
  if (!parent) return next(new AppError('Parent not found', 404));

  // Fetch targeted students
  const students = await Student.find({ _id: { $in: studentIds } });
  if (students.length !== studentIds.length) {
    return next(new AppError('Some students not found', 400));
  }

  if (!allowReassign) {
    const already = students.filter(
      (s) => s.parent && s.parent.toString() !== parentId,
    );
    if (already.length) {
      return next(
        new AppError(
          'One or more students already have a different parent',
          400,
        ),
      );
    }
  }

  await Student.updateMany({ _id: { $in: studentIds } }, { parent: parentId });

  const updatedParent = await Parent.findById(parentId)
    .populate({ path: 'students', select: 'name' })
    .populate({ path: 'username', select: 'username' });

  res.status(200).json({
    status: 'success',
    data: { data: updatedParent },
  });
});

// Unassign students (set their parent to null) - optional; only if schema allows parent nullable
exports.unassignStudents = catchAsync(async (req, res, next) => {
  const parentId = req.params.id;
  const { studentIds = [] } = req.body;
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return next(new AppError('Provide non-empty studentIds array', 400));
  }
  // Ensure parent exists
  const parent = await Parent.findById(parentId);
  if (!parent) return next(new AppError('Parent not found', 404));

  // NOTE: studentModel currently requires parent. To truly unassign, that required flag must be removed.
  // For safety, block if required is enforced.
  return next(
    new AppError(
      'Unassign not supported while student.parent is required',
      400,
    ),
  );
});
