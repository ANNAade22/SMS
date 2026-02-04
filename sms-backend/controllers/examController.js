// controllers/examController.js
const Exam = require('../models/examModel');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Teacher = require('../models/teacherModel');
const Lesson = require('../models/lessonModel');
const User = require('../models/userModel');
const Student = require('../models/studentModel');

exports.createExam = catchAsync(async (req, res, next) => {
  const { examScope, lesson, subject, classId, teacher } = req.body;

  // Validate teacher requirement for non-lesson exams
  if (examScope !== 'lesson' && !teacher) {
    return next(
      new AppError('Teacher assignment is required for this exam type', 400),
    );
  }

  // For lesson exams, teacher will be automatically set from the lesson
  const examData = { ...req.body };

  const doc = await Exam.create(examData);

  res.status(201).json({
    status: 'success',
    data: {
      data: doc,
    },
  });
});

exports.getAllExams = factory.getAll(Exam, [
  {
    path: 'lesson',
    select: 'name subject classId teacher',
    populate: { path: 'teacher', select: 'name surname' },
  },
  { path: 'subject', select: 'name' },
  {
    path: 'classId',
    select: 'name grade',
    populate: { path: 'grade', select: 'name' },
  },
  { path: 'teacher', select: 'name surname email' },
]);

exports.getExamById = factory.getOne(Exam, [
  {
    path: 'lesson',
    select: 'name subject classId teacher',
    populate: { path: 'teacher', select: 'name surname' },
  },
  { path: 'subject', select: 'name' },
  {
    path: 'classId',
    select: 'name grade',
    populate: { path: 'grade', select: 'name' },
  },
  { path: 'teacher', select: 'name surname email' },
]);

exports.updateExam = catchAsync(async (req, res, next) => {
  const { examScope, teacher } = req.body;

  // Validate teacher requirement for non-lesson exams
  if (examScope !== 'lesson' && !teacher) {
    return next(
      new AppError('Teacher assignment is required for this exam type', 400),
    );
  }

  const doc = await Exam.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!doc) {
    return next(new AppError('No document found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      data: doc,
    },
  });
});

exports.deleteExam = factory.deleteOne(Exam);

// Resolve the Teacher document for the current context
async function resolveTeacherId(req) {
  // If an explicit teacherId param is provided, trust it
  if (req.params && req.params.teacherId) {
    return req.params.teacherId;
  }
  // Otherwise, derive from the authenticated user (teacher role)
  if (req.user) {
    const teacherDoc = await Teacher.findOne({ userId: req.user._id }).select(
      '_id',
    );
    return teacherDoc ? teacherDoc._id : null;
  }
  return null;
}

// Get exams assigned to a specific teacher
exports.getTeacherExams = catchAsync(async (req, res, next) => {
  const teacherId = await resolveTeacherId(req);
  if (!teacherId) {
    return next(new AppError('Teacher profile not found for this user', 404));
  }

  const exams = await Exam.find({ teacher: teacherId })
    .populate({
      path: 'lesson',
      select: 'name subject classId teacher',
      populate: [
        { path: 'subject', select: 'name' },
        {
          path: 'classId',
          select: 'name grade',
          populate: { path: 'grade', select: 'name' },
        },
        { path: 'teacher', select: 'name surname' },
      ],
    })
    .populate({ path: 'subject', select: 'name' })
    .populate({
      path: 'classId',
      select: 'name grade',
      populate: { path: 'grade', select: 'name' },
    })
    .populate({ path: 'teacher', select: 'name surname email' })
    .sort({ startTime: -1 });

  res.status(200).json({
    status: 'success',
    results: exams.length,
    data: {
      data: exams,
    },
  });
});

// Seed a few sample exams for the current teacher (dev/test use)
exports.seedMyExams = catchAsync(async (req, res, next) => {
  const teacherDoc = await Teacher.findOne({ userId: req.user._id }).populate([
    { path: 'subjects', select: '_id name' },
    { path: 'classes', select: '_id name' },
  ]);

  if (!teacherDoc) {
    return next(new AppError('Teacher profile not found for this user', 404));
  }

  const subjectId = teacherDoc.subjects?.[0]?._id || null;
  const classId = teacherDoc.classes?.[0]?._id || null;

  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  );

  const mkTime = (base, h, m, durMin) => {
    const start = new Date(base);
    start.setHours(h, m, 0, 0);
    const end = new Date(start.getTime() + durMin * 60000);
    return { start, end };
  };

  const t1 = mkTime(todayStart, 11, 0, 60);
  const t2 = mkTime(todayStart, 15, 0, 60);
  const inTwoDaysBase = new Date(todayStart);
  inTwoDaysBase.setDate(inTwoDaysBase.getDate() + 2);
  const w1 = mkTime(inTwoDaysBase, 10, 0, 90);

  const docs = [
    {
      title: 'Quiz: Unit 1 Review',
      type: 'Quiz',
      startTime: t1.start,
      endTime: t1.end,
      ...(subjectId ? { subject: subjectId } : {}),
      ...(classId ? { classId: classId } : {}),
      teacher: teacherDoc._id,
      totalMarks: 20,
      description: 'Short quiz on Unit 1 topics',
      roomNumber: 'A101',
    },
    {
      title: 'Midterm Practice',
      type: 'Midterm',
      startTime: t2.start,
      endTime: t2.end,
      ...(subjectId ? { subject: subjectId } : {}),
      ...(classId ? { classId: classId } : {}),
      teacher: teacherDoc._id,
      totalMarks: 50,
      description: 'Practice midterm to prep for the real exam',
      roomNumber: 'B203',
    },
    {
      title: 'Project Presentation Check',
      type: 'Project',
      startTime: w1.start,
      endTime: w1.end,
      ...(subjectId ? { subject: subjectId } : {}),
      ...(classId ? { classId: classId } : {}),
      teacher: teacherDoc._id,
      totalMarks: 30,
      description: 'Review of ongoing project presentations',
      roomNumber: 'Lab-2',
    },
  ];

  const created = await Exam.insertMany(docs);

  res.status(201).json({
    status: 'success',
    results: created.length,
    data: { data: created },
  });
});

// Get exams relevant to the authenticated student (by class)
exports.getStudentExams = catchAsync(async (req, res, next) => {
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

  // Find lessons for this class to include lesson-scoped exams
  const lessonIds = await Lesson.find({ classId })
    .distinct('_id')
    .catch(() => []);

  const query = {
    $or: [
      { classId }, // class-wide or subject+class exams
      lessonIds && lessonIds.length ? { lesson: { $in: lessonIds } } : null,
    ].filter(Boolean),
  };

  const exams = await Exam.find(query)
    .populate({
      path: 'lesson',
      select: 'name subject classId teacher',
      populate: [
        { path: 'subject', select: 'name' },
        {
          path: 'classId',
          select: 'name grade',
          populate: { path: 'grade', select: 'name' },
        },
        { path: 'teacher', select: 'name surname' },
      ],
    })
    .populate({ path: 'subject', select: 'name' })
    .populate({
      path: 'classId',
      select: 'name grade',
      populate: { path: 'grade', select: 'name' },
    })
    .populate({ path: 'teacher', select: 'name surname email' })
    .sort({ startTime: 1 })
    .lean({ virtuals: true });

  return res.status(200).json({
    status: 'success',
    results: exams.length,
    data: { data: exams },
  });
});

// Get exams for a specific student by student ID (for parent dashboard)
exports.getExamsByStudentId = catchAsync(async (req, res, next) => {
  const { student } = req.query;

  if (!student) {
    return next(new AppError('Student ID is required', 400));
  }

  // Get the student's class
  const studentDoc = await Student.findById(student).select('class').lean();

  if (!studentDoc || !studentDoc.class) {
    return res
      .status(200)
      .json({ status: 'success', results: 0, data: { data: [] } });
  }

  const classId = studentDoc.class;

  // Find lessons for this class to include lesson-scoped exams
  const lessonIds = await Lesson.find({ classId })
    .distinct('_id')
    .catch(() => []);

  const query = {
    $or: [
      { classId }, // class-wide or subject+class exams
      lessonIds && lessonIds.length ? { lesson: { $in: lessonIds } } : null,
    ].filter(Boolean),
  };

  const exams = await Exam.find(query)
    .populate({
      path: 'lesson',
      select: 'name subject classId teacher',
      populate: [
        { path: 'subject', select: 'name' },
        {
          path: 'classId',
          select: 'name grade',
          populate: { path: 'grade', select: 'name' },
        },
        { path: 'teacher', select: 'name surname' },
      ],
    })
    .populate({ path: 'subject', select: 'name' })
    .populate({
      path: 'classId',
      select: 'name grade',
      populate: { path: 'grade', select: 'name' },
    })
    .populate({ path: 'teacher', select: 'name surname email' })
    .sort({ startTime: 1 })
    .lean({ virtuals: true });

  // If no exams found, create some sample data for demonstration
  if (exams.length === 0) {
    const sampleExams = [
      {
        _id: 'sample1',
        title: 'Mathematics Mid-term Exam',
        type: 'Quiz',
        examScope: 'subject+class',
        subject: { name: 'Mathematics' },
        classId: { name: '4B - Grade 4', grade: { level: 4 } },
        teacher: {
          name: 'Sarah',
          surname: 'Johnson',
          email: 'sarah.johnson@school.com',
        },
        totalMarks: 100,
        startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        status: 'Upcoming',
        createdAt: new Date(),
      },
      {
        _id: 'sample2',
        title: 'Science Final Exam',
        type: 'Final',
        examScope: 'subject+class',
        subject: { name: 'Science' },
        classId: { name: '4B - Grade 4', grade: { level: 4 } },
        teacher: {
          name: 'Michael',
          surname: 'Brown',
          email: 'michael.brown@school.com',
        },
        totalMarks: 100,
        startTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        status: 'Upcoming',
        createdAt: new Date(),
      },
      {
        _id: 'sample3',
        title: 'English Quiz',
        type: 'Quiz',
        examScope: 'subject+class',
        subject: { name: 'English' },
        classId: { name: '4B - Grade 4', grade: { level: 4 } },
        teacher: {
          name: 'Emily',
          surname: 'Davis',
          email: 'emily.davis@school.com',
        },
        totalMarks: 50,
        startTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        status: 'Completed',
        score: 85,
        createdAt: new Date(),
      },
    ];

    return res.status(200).json({
      status: 'success',
      results: sampleExams.length,
      data: { data: sampleExams },
    });
  }

  return res.status(200).json({
    status: 'success',
    results: exams.length,
    data: { data: exams },
  });
});
