const Semester = require('../models/semesterModel');
const Result = require('../models/resultModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Get all semesters
exports.getAllSemesters = catchAsync(async (req, res, next) => {
  const semesters = await Semester.find()
    .populate('createdBy', 'name email')
    .sort({ academicYear: -1, semester: 1 });

  res.status(200).json({
    status: 'success',
    results: semesters.length,
    data: {
      data: semesters,
    },
  });
});

// Get current active semester
exports.getCurrentSemester = catchAsync(async (req, res, next) => {
  const currentSemester = await Semester.findOne({ isActive: true }).populate(
    'createdBy',
    'name email',
  );

  if (!currentSemester) {
    return res.status(200).json({
      status: 'success',
      data: {
        data: null,
      },
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      data: currentSemester,
    },
  });
});

// Create new semester
exports.createSemester = catchAsync(async (req, res, next) => {
  // Check if semester already exists
  const existingSemester = await Semester.findOne({
    semester: req.body.semester,
    academicYear: req.body.academicYear,
  });

  if (existingSemester) {
    return next(
      new AppError('Semester already exists for this academic year', 400),
    );
  }

  // Add createdBy field
  req.body.createdBy = req.user.id;

  const semester = await Semester.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      data: semester,
    },
  });
});

// Update semester
exports.updateSemester = catchAsync(async (req, res, next) => {
  const semester = await Semester.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).populate('createdBy', 'name email');

  if (!semester) {
    return next(new AppError('No semester found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      data: semester,
    },
  });
});

// Close current semester (archive it)
exports.closeCurrentSemester = catchAsync(async (req, res, next) => {
  const currentSemester = await Semester.findOne({ isActive: true });

  if (!currentSemester) {
    return next(new AppError('No active semester found to close', 404));
  }

  // Update semester status
  currentSemester.isActive = false;
  currentSemester.status = 'Completed';
  await currentSemester.save();

  // Archive all results for this semester
  await Result.updateMany(
    {
      semester: currentSemester.semester,
      academicYear: currentSemester.academicYear,
    },
    { isActive: false },
  );

  res.status(200).json({
    status: 'success',
    message: 'Semester closed and archived successfully',
    data: {
      data: currentSemester,
    },
  });
});

// Start new semester
exports.startNewSemester = catchAsync(async (req, res, next) => {
  const { semester, academicYear, startDate, endDate, description } = req.body;

  // Check if semester already exists
  const existingSemester = await Semester.findOne({
    semester,
    academicYear,
  });

  if (existingSemester) {
    return next(
      new AppError('Semester already exists for this academic year', 400),
    );
  }

  // Create new semester
  const newSemester = await Semester.create({
    semester,
    academicYear,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    description,
    isActive: true,
    status: 'Active',
    createdBy: req.user.id,
  });

  res.status(201).json({
    status: 'success',
    message: 'New semester started successfully',
    data: {
      data: newSemester,
    },
  });
});

// Get semester statistics
exports.getSemesterStats = catchAsync(async (req, res, next) => {
  const { semester, academicYear } = req.params;

  const stats = await Result.aggregate([
    {
      $match: {
        semester,
        academicYear,
      },
    },
    {
      $group: {
        _id: null,
        totalResults: { $sum: 1 },
        totalStudents: { $addToSet: '$student' },
        totalSubjects: { $addToSet: '$subject' },
        totalClasses: { $addToSet: '$class' },
        averageScore: {
          $avg: { $multiply: [{ $divide: ['$score', '$totalMarks'] }, 100] },
        },
      },
    },
    {
      $project: {
        totalResults: 1,
        totalStudents: { $size: '$totalStudents' },
        totalSubjects: { $size: '$totalSubjects' },
        totalClasses: { $size: '$totalClasses' },
        averageScore: { $round: ['$averageScore', 2] },
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: stats[0] || {
        totalResults: 0,
        totalStudents: 0,
        totalSubjects: 0,
        totalClasses: 0,
        averageScore: 0,
      },
    },
  });
});

// Get student's overall CGPA across all semesters
exports.getStudentCGPA = catchAsync(async (req, res, next) => {
  const { studentId } = req.params;

  const cgpaData = await Result.aggregate([
    {
      $match: {
        student: new mongoose.Types.ObjectId(studentId),
      },
    },
    {
      $group: {
        _id: {
          semester: '$semester',
          academicYear: '$academicYear',
        },
        semesterGPA: {
          $avg: { $multiply: [{ $divide: ['$score', '$totalMarks'] }, 4] },
        },
        totalResults: { $sum: 1 },
      },
    },
    {
      $sort: {
        '_id.academicYear': 1,
        '_id.semester': 1,
      },
    },
    {
      $group: {
        _id: null,
        semesters: {
          $push: {
            semester: '$_id.semester',
            academicYear: '$_id.academicYear',
            gpa: { $round: ['$semesterGPA', 2] },
            totalResults: '$totalResults',
          },
        },
        overallCGPA: {
          $avg: { $multiply: [{ $divide: ['$score', '$totalMarks'] }, 4] },
        },
      },
    },
    {
      $project: {
        semesters: 1,
        overallCGPA: { $round: ['$overallCGPA', 2] },
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: cgpaData[0] || {
        semesters: [],
        overallCGPA: 0,
      },
    },
  });
});
