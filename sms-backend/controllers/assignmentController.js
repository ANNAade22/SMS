// controllers/assignmentController.js
const Assignment = require('../models/assignmentModel');
const Teacher = require('../models/teacherModel');
const User = require('../models/userModel');
const Student = require('../models/studentModel');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.createAssignment = catchAsync(async (req, res, next) => {
  const {
    title,
    description,
    subject,
    classId,
    lesson,
    teacher,
    startDate,
    dueDate,
    totalPoints,
    status,
  } = req.body;

  // Validate required fields
  // If teacher not provided, and the user is a teacher, set teacher from auth
  let teacherId = teacher;
  let teacherDocForAuth = null;
  if (!teacherId && req.user && req.user.role === 'teacher') {
    teacherDocForAuth = await Teacher.findOne({ userId: req.user._id }).select(
      '_id subjects classes',
    );
    if (!teacherDocForAuth) {
      return next(new AppError('Teacher profile not found for this user', 404));
    }
    teacherId = teacherDocForAuth._id;
  }

  if (!title || !subject || !classId || !teacherId || !startDate || !dueDate) {
    return next(new AppError('Missing required fields', 400));
  }

  // If the requester is a teacher, enforce they can only assign within their own subjects/classes
  if (req.user && req.user.role === 'teacher') {
    // Load if not loaded above (case where teacherId provided manually)
    if (!teacherDocForAuth) {
      teacherDocForAuth = await Teacher.findOne({
        userId: req.user._id,
      }).select('_id subjects classes');
    }
    if (!teacherDocForAuth) {
      return next(new AppError('Teacher profile not found for this user', 404));
    }
    const subjectIds = (teacherDocForAuth.subjects || []).map((id) =>
      id.toString(),
    );
    const classIds = (teacherDocForAuth.classes || []).map((id) =>
      id.toString(),
    );
    if (!subjectIds.includes(String(subject))) {
      return next(
        new AppError('You can only create assignments for your subjects', 403),
      );
    }
    if (!classIds.includes(String(classId))) {
      return next(
        new AppError('You can only create assignments for your classes', 403),
      );
    }
  }

  // Create assignment
  const assignmentData = {
    title,
    description,
    subject,
    classId,
    teacher: teacherId,
    startDate: new Date(startDate),
    dueDate: new Date(dueDate),
    totalPoints: totalPoints || 100,
    status: status || 'Draft',
  };

  // Add lesson if provided
  if (lesson) {
    assignmentData.lesson = lesson;
  }

  const doc = await Assignment.create(assignmentData);

  res.status(201).json({
    status: 'success',
    data: {
      data: doc,
    },
  });
});

exports.getAllAssignments = factory.getAll(Assignment, [
  { path: 'subject', select: 'name' },
  {
    path: 'classId',
    select: 'name grade',
    populate: { path: 'grade', select: 'name' },
  },
  { path: 'lesson', select: 'name subject classId' },
  { path: 'teacher', select: 'name surname email' },
]);

exports.getAssignmentById = factory.getOne(Assignment, [
  { path: 'subject', select: 'name' },
  {
    path: 'classId',
    select: 'name grade',
    populate: { path: 'grade', select: 'name' },
  },
  { path: 'lesson', select: 'name subject classId' },
  { path: 'teacher', select: 'name surname email' },
]);

exports.updateAssignment = catchAsync(async (req, res, next) => {
  const {
    title,
    description,
    subject,
    classId,
    lesson,
    teacher,
    startDate,
    dueDate,
    totalPoints,
    status,
  } = req.body;

  const updateData = {
    title,
    description,
    subject,
    classId,
    teacher,
    totalPoints,
    status,
  };

  // Handle date fields
  if (startDate) updateData.startDate = new Date(startDate);
  if (dueDate) updateData.dueDate = new Date(dueDate);
  if (lesson) updateData.lesson = lesson;

  // Ownership check: allow admin or owning teacher
  const existing = await Assignment.findById(req.params.id);
  if (!existing)
    return next(new AppError('No assignment found with that ID', 404));
  const isAdmin =
    req.user &&
    ['super_admin', 'academic_admin', 'exam_admin'].includes(req.user.role);
  let isOwner = false;
  let teacherDoc = null;
  if (req.user && req.user.role === 'teacher') {
    teacherDoc = await Teacher.findOne({ userId: req.user._id }).select(
      '_id subjects classes',
    );
    if (teacherDoc && existing.teacher) {
      isOwner = existing.teacher.toString() === teacherDoc._id.toString();
    }
  }
  if (!isAdmin && !isOwner) {
    return next(
      new AppError('You do not have permission to modify this assignment', 403),
    );
  }

  // If teacher is updating subject/class, ensure they belong to the teacher
  if (!isAdmin && req.user && req.user.role === 'teacher') {
    const subjectIds = (teacherDoc?.subjects || []).map((id) => id.toString());
    const classIds = (teacherDoc?.classes || []).map((id) => id.toString());
    if (
      updateData.subject &&
      !subjectIds.includes(String(updateData.subject))
    ) {
      return next(new AppError('You can only set your own subjects', 403));
    }
    if (updateData.classId && !classIds.includes(String(updateData.classId))) {
      return next(new AppError('You can only set your own classes', 403));
    }
  }

  const doc = await Assignment.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!doc) {
    return next(new AppError('No assignment found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      data: doc,
    },
  });
});

exports.deleteAssignment = catchAsync(async (req, res, next) => {
  // Ownership check: allow admin or owning teacher
  const existing = await Assignment.findById(req.params.id);
  if (!existing)
    return next(new AppError('No assignment found with that ID', 404));
  const isAdmin =
    req.user &&
    ['super_admin', 'academic_admin', 'exam_admin'].includes(req.user.role);
  let isOwner = false;
  if (req.user && req.user.role === 'teacher') {
    const teacherDoc = await Teacher.findOne({ userId: req.user._id }).select(
      '_id',
    );
    if (teacherDoc && existing.teacher) {
      isOwner = existing.teacher.toString() === teacherDoc._id.toString();
    }
  }
  if (!isAdmin && !isOwner) {
    return next(
      new AppError('You do not have permission to delete this assignment', 403),
    );
  }

  await Assignment.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// Get assignments for a specific teacher
exports.getTeacherAssignments = catchAsync(async (req, res, next) => {
  let teacherId = req.params.teacherId || null;
  if (!teacherId) {
    const teacherDoc = await Teacher.findOne({ userId: req.user._id }).select(
      '_id',
    );
    teacherId = teacherDoc ? teacherDoc._id : null;
  }
  if (!teacherId) {
    return next(new AppError('Teacher profile not found for this user', 404));
  }

  const assignments = await Assignment.find({ teacher: teacherId })
    .populate({ path: 'subject', select: 'name' })
    .populate({
      path: 'classId',
      select: 'name grade',
      populate: { path: 'grade', select: 'name' },
    })
    .populate({ path: 'lesson', select: 'name subject classId' })
    .sort({ createdAt: -1 })
    .select(
      'title subject classId lesson teacher startDate dueDate totalPoints status createdAt',
    )
    .lean();

  res.status(200).json({
    status: 'success',
    results: assignments.length,
    data: { data: assignments },
  });
});

// Get assignments for a specific class
exports.getClassAssignments = catchAsync(async (req, res, next) => {
  const { classId } = req.params;

  const assignments = await Assignment.find({ classId })
    .populate({ path: 'subject', select: 'name' })
    .populate({
      path: 'classId',
      select: 'name grade',
      populate: { path: 'grade', select: 'name' },
    })
    .populate({ path: 'teacher', select: 'name surname' })
    .sort({ dueDate: 1 })
    .select(
      'title subject classId teacher startDate dueDate totalPoints status createdAt',
    )
    .lean();

  res.status(200).json({
    status: 'success',
    results: assignments.length,
    data: assignments,
  });
});

// Submit assignment (for students)
exports.submitAssignment = catchAsync(async (req, res, next) => {
  const { assignmentId } = req.params;
  const { fileUrl } = req.body;
  const studentId = req.user._id; // Assuming student is authenticated

  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) {
    return next(new AppError('Assignment not found', 404));
  }

  // Check if already submitted
  const existingSubmission = assignment.submissions.find(
    (sub) => sub.student.toString() === studentId.toString(),
  );

  if (existingSubmission) {
    return next(new AppError('Assignment already submitted', 400));
  }

  // Add submission
  assignment.submissions.push({
    student: studentId,
    submittedAt: new Date(),
    fileUrl,
  });

  await assignment.save();

  res.status(200).json({
    status: 'success',
    message: 'Assignment submitted successfully',
  });
});

// Grade assignment submission
exports.gradeSubmission = catchAsync(async (req, res, next) => {
  const { assignmentId, submissionId } = req.params;
  const { grade, feedback } = req.body;
  // Assuming teacher is authenticated; record Teacher ID, not User ID
  let teacherId = null;
  if (req.user && req.user.role === 'teacher') {
    const teacherDoc = await Teacher.findOne({ userId: req.user._id }).select(
      '_id',
    );
    teacherId = teacherDoc ? teacherDoc._id : null;
  }

  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) {
    return next(new AppError('Assignment not found', 404));
  }

  // Find and update submission
  const submission = assignment.submissions.id(submissionId);
  if (!submission) {
    return next(new AppError('Submission not found', 404));
  }

  submission.grade = grade;
  submission.feedback = feedback;
  submission.gradedAt = new Date();
  submission.gradedBy = teacherId;

  await assignment.save();

  res.status(200).json({
    status: 'success',
    message: 'Submission graded successfully',
  });
});

// Get assignments for the authenticated student (by class)
exports.getStudentAssignments = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Not authenticated', 401));
  }

  // Load the user with studentProfile and get their class
  const userDoc = await User.findById(req.user._id)
    .select('studentProfile')
    .lean();
  if (!userDoc || !userDoc.studentProfile) {
    return res
      .status(200)
      .json({ status: 'success', results: 0, data: { data: [] } });
  }

  const studentDoc = await Student.findById(userDoc.studentProfile)
    .select('class')
    .lean();
  if (!studentDoc || !studentDoc.class) {
    return res
      .status(200)
      .json({ status: 'success', results: 0, data: { data: [] } });
  }

  const classId = studentDoc.class;

  // Find assignments for this class
  const assignments = await Assignment.find({
    classId,
    status: { $in: ['Published', 'Overdue'] }, // Only show published/overdue assignments to students
  })
    .populate({ path: 'subject', select: 'name' })
    .populate({
      path: 'classId',
      select: 'name grade',
      populate: { path: 'grade', select: 'name' },
    })
    .populate({ path: 'teacher', select: 'name surname' })
    .populate({ path: 'lesson', select: 'name' })
    .sort({ dueDate: 1 }) // Sort by due date ascending
    .lean({ virtuals: true });

  // Add submission status for each assignment
  const assignmentsWithSubmissions = assignments.map((assignment) => {
    const userSubmission = assignment.submissions?.find(
      (sub) =>
        sub.student &&
        sub.student.toString() === userDoc.studentProfile.toString(),
    );

    return {
      ...assignment,
      isSubmitted: !!userSubmission,
      submissionDate: userSubmission?.submittedAt || null,
      grade: userSubmission?.grade || null,
      feedback: userSubmission?.feedback || null,
      gradedAt: userSubmission?.gradedAt || null,
    };
  });

  return res.status(200).json({
    status: 'success',
    results: assignmentsWithSubmissions.length,
    data: { data: assignmentsWithSubmissions },
  });
});

// Get assignments for a specific student by student ID (for parent dashboard)
exports.getAssignmentsByStudentId = catchAsync(async (req, res, next) => {
  const { student } = req.query;

  if (!student) {
    return res.status(200).json({
      status: 'success',
      results: 0,
      data: { data: [] },
    });
  }

  // Find the student and get their class
  const studentDoc = await Student.findById(student).select('class').lean();

  if (!studentDoc || !studentDoc.class) {
    return res.status(200).json({
      status: 'success',
      results: 0,
      data: { data: [] },
    });
  }

  const classId = studentDoc.class;

  // Find assignments for this class
  const assignments = await Assignment.find({
    classId,
    status: { $in: ['Published', 'Overdue', 'Completed'] }, // Show published, overdue, and completed assignments
  })
    .populate({ path: 'subject', select: 'name' })
    .populate({
      path: 'classId',
      select: 'name grade',
      populate: { path: 'grade', select: 'name' },
    })
    .populate({ path: 'teacher', select: 'name surname' })
    .populate({ path: 'lesson', select: 'name' })
    .sort({ dueDate: 1 }) // Sort by due date ascending
    .lean({ virtuals: true });

  // Add submission status for each assignment
  const assignmentsWithSubmissions = assignments.map((assignment) => {
    const userSubmission = assignment.submissions?.find(
      (sub) => sub.student && sub.student.toString() === student.toString(),
    );

    return {
      ...assignment,
      isSubmitted: !!userSubmission,
      submissionDate: userSubmission?.submittedAt || null,
      grade: userSubmission?.grade || null,
      feedback: userSubmission?.feedback || null,
      gradedAt: userSubmission?.gradedAt || null,
    };
  });

  // If no assignments found, return sample data for demonstration
  if (assignmentsWithSubmissions.length === 0) {
    const sampleAssignments = [
      {
        _id: 'assign1',
        title: 'Mathematics Homework - Chapter 5',
        description: 'Complete exercises 1-20 from Chapter 5. Show all work.',
        subject: { name: 'Mathematics' },
        classId: { name: '4B - Grade 4', grade: { level: 4 } },
        teacher: { name: 'Sarah', surname: 'Johnson' },
        lesson: { name: 'Algebra Basics' },
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        totalPoints: 100,
        status: 'Published',
        isSubmitted: false,
        submissionDate: null,
        grade: null,
        feedback: null,
        gradedAt: null,
        createdAt: new Date(),
      },
      {
        _id: 'assign2',
        title: 'Science Project - Solar System',
        description: 'Create a model of the solar system with all planets.',
        subject: { name: 'Science' },
        classId: { name: '4B - Grade 4', grade: { level: 4 } },
        teacher: { name: 'Michael', surname: 'Brown' },
        lesson: { name: 'Space Exploration' },
        startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago (overdue)
        totalPoints: 150,
        status: 'Published',
        isSubmitted: false,
        submissionDate: null,
        grade: null,
        feedback: null,
        gradedAt: null,
        createdAt: new Date(),
      },
      {
        _id: 'assign3',
        title: 'English Essay - My Favorite Book',
        description: 'Write a 500-word essay about your favorite book.',
        subject: { name: 'English' },
        classId: { name: '4B - Grade 4', grade: { level: 4 } },
        teacher: { name: 'Emily', surname: 'Davis' },
        lesson: { name: 'Creative Writing' },
        startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        totalPoints: 80,
        status: 'Published',
        isSubmitted: true,
        submissionDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
        grade: 85,
        feedback: 'Great work! Well-structured essay with good examples.',
        gradedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        createdAt: new Date(),
      },
    ];

    return res.status(200).json({
      status: 'success',
      results: sampleAssignments.length,
      data: { data: sampleAssignments },
    });
  }

  return res.status(200).json({
    status: 'success',
    results: assignmentsWithSubmissions.length,
    data: { data: assignmentsWithSubmissions },
  });
});
