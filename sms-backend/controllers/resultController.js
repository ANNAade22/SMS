// controllers/resultController.js
const Result = require('../models/resultModel');
const Student = require('../models/studentModel');
const User = require('../models/userModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

// Get student-specific results with semester grouping and GPA calculation
exports.getStudentResults = catchAsync(async (req, res, next) => {
  // Resolve the student profile from the authenticated user
  const userDoc = await User.findById(req.user._id)
    .select('studentProfile')
    .lean();

  if (!userDoc || !userDoc.studentProfile) {
    return res.status(200).json({
      status: 'success',
      results: 0,
      data: { semesters: [] },
    });
  }

  const student = await Student.findById(userDoc.studentProfile)
    .select('_id class')
    .lean();
  if (!student) {
    return res.status(200).json({
      status: 'success',
      results: 0,
      data: { semesters: [] },
    });
  }

  // Fetch all results for this student (including legacy data)
  const results = await Result.find({ student: student._id })
    .populate([
      { path: 'subject', select: 'name code credits' },
      { path: 'class', select: 'name grade' },
    ])
    .sort({ date: -1 });

  // Group results by semester with GPA calculation
  const semesterData = {};

  results.forEach((result) => {
    // Use new semester fields if available, otherwise fallback to legacy
    const semester = result.semester || result.class?.semester || 'Legacy';
    const academicYear =
      result.academicYear ||
      result.class?.academicYear ||
      new Date().getFullYear();
    const semesterKey = `${academicYear}-${semester}`;

    if (!semesterData[semesterKey]) {
      semesterData[semesterKey] = {
        semester,
        academicYear,
        subjects: {},
        totalScore: 0,
        totalMarks: 0,
        totalCredits: 0,
        gradePoints: 0,
        resultCount: 0,
      };
    }

    const subjectId = result.subject._id.toString();
    if (!semesterData[semesterKey].subjects[subjectId]) {
      semesterData[semesterKey].subjects[subjectId] = {
        subject: result.subject,
        results: [],
        totalScore: 0,
        totalMarks: 0,
        averageScore: 0,
        letterGrade: '',
        gradePoint: 0,
      };
    }

    // Add result to subject
    semesterData[semesterKey].subjects[subjectId].results.push({
      _id: result._id,
      assessmentTitle: result.assessmentTitle,
      examType: result.examType,
      score: result.score,
      totalMarks: result.totalMarks,
      grade: result.grade,
      percentage: (result.score / result.totalMarks) * 100,
      date: result.date,
      status: result.status,
      remarks: result.remarks,
    });

    // Update subject totals
    const subjectData = semesterData[semesterKey].subjects[subjectId];
    subjectData.totalScore += result.score;
    subjectData.totalMarks += result.totalMarks;
    subjectData.averageScore =
      (subjectData.totalScore / subjectData.totalMarks) * 100;

    // Calculate letter grade based on average
    subjectData.letterGrade = calculateLetterGrade(subjectData.averageScore);
    subjectData.gradePoint = calculateGradePoint(subjectData.letterGrade);

    // Update semester totals
    semesterData[semesterKey].totalScore += result.score;
    semesterData[semesterKey].totalMarks += result.totalMarks;
    semesterData[semesterKey].resultCount++;
  });

  // Calculate GPA for each semester
  Object.keys(semesterData).forEach((semesterKey) => {
    const semester = semesterData[semesterKey];
    const subjects = Object.values(semester.subjects);

    if (subjects.length > 0) {
      // Simple GPA calculation (average of all subject grade points)
      const totalGradePoints = subjects.reduce(
        (sum, subject) => sum + subject.gradePoint,
        0,
      );
      semester.gpa = totalGradePoints / subjects.length;
      semester.overallPercentage =
        (semester.totalScore / semester.totalMarks) * 100;

      // Convert subjects object to array for easier frontend handling
      semester.subjects = subjects;
    }
  });

  // Convert to array and sort by academic year and semester
  const semesterArray = Object.keys(semesterData)
    .map((key) => ({
      semesterKey: key,
      ...semesterData[key],
    }))
    .sort((a, b) => {
      if (a.academicYear !== b.academicYear) {
        return b.academicYear - a.academicYear; // Latest year first
      }
      return b.semester.localeCompare(a.semester); // Latest semester first
    });

  res.status(200).json({
    status: 'success',
    results: results.length,
    data: {
      semesters: semesterArray,
      totalResults: results.length,
    },
  });
});

// Helper function to calculate letter grade
function calculateLetterGrade(percentage) {
  if (percentage >= 90) return 'A+';
  if (percentage >= 85) return 'A';
  if (percentage >= 80) return 'A-';
  if (percentage >= 75) return 'B+';
  if (percentage >= 70) return 'B';
  if (percentage >= 65) return 'B-';
  if (percentage >= 60) return 'C+';
  if (percentage >= 55) return 'C';
  if (percentage >= 50) return 'C-';
  if (percentage >= 45) return 'D';
  return 'F';
}

// Helper function to calculate grade point
function calculateGradePoint(letterGrade) {
  const gradePoints = {
    'A+': 4.0,
    A: 3.7,
    'A-': 3.3,
    'B+': 3.0,
    B: 2.7,
    'B-': 2.3,
    'C+': 2.0,
    C: 1.7,
    'C-': 1.3,
    D: 1.0,
    F: 0.0,
  };
  return gradePoints[letterGrade] || 0.0;
}

// Get all results (admin/teacher view) - filtered by current semester
exports.getAllResults = catchAsync(async (req, res, next) => {
  // Get current active semester
  const Semester = require('../models/semesterModel');
  const currentSemester = await Semester.findOne({ isActive: true });

  let filter = {};

  // Check if user wants to see all results (admin view)
  const showAllResults =
    req.query.showAll === 'true' ||
    req.query.showAll === 'true' ||
    (req.query.semester === '' && req.query.academicYear === '');

  // If there's an active semester and no explicit semester filter, filter by current semester
  if (
    currentSemester &&
    !showAllResults &&
    !req.query.semester &&
    !req.query.academicYear
  ) {
    filter = {
      semester: currentSemester.semester,
      academicYear: currentSemester.academicYear,
    };
  }
  // If no active semester or explicit filters, show all results (for admin to see legacy data)

  // Add any additional filters from query parameters
  if (req.query.class) filter.class = req.query.class;
  if (req.query.subject) filter.subject = req.query.subject;
  if (req.query.student) filter.student = req.query.student;
  if (req.query.gradingPeriod) filter.gradingPeriod = req.query.gradingPeriod;
  if (req.query.semester && req.query.semester !== '')
    filter.semester = req.query.semester;
  if (req.query.academicYear && req.query.academicYear !== '')
    filter.academicYear = req.query.academicYear;

  // Debug logging removed

  const features = new (require('../utils/apiFeatures'))(
    Result.find(filter),
    req.query,
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const results = await features.query.populate([
    { path: 'student', select: 'name surname email' },
    { path: 'class', select: 'name grade' },
    { path: 'subject', select: 'name code' },
  ]);

  res.status(200).json({
    status: 'success',
    results: results.length,
    data: {
      data: results,
    },
  });
});

exports.getResult = factory.getOne(Result, [
  { path: 'student', select: 'name surname' },
  { path: 'subject', select: 'name' },
  { path: 'class', select: 'name' },
  // Keep old fields for backward compatibility
  { path: 'exam', select: 'title subject' },
  { path: 'assignment', select: 'title subject' },
]);

exports.createResult = async (req, res, next) => {
  try {
    // Get current active semester
    const Semester = require('../models/semesterModel');
    const currentSemester = await Semester.findOne({ isActive: true });

    // Filter out _id field to prevent validation errors
    const { _id, ...createData } = req.body;

    // Add semester information if not provided
    if (currentSemester && !createData.semester) {
      createData.semester = currentSemester.semester;
      createData.academicYear = currentSemester.academicYear;
    }

    // Set default grading period if not provided
    if (!createData.gradingPeriod) {
      createData.gradingPeriod = 'Continuous Assessment';
    }

    const doc = await Result.create(createData);

    // Populate the references for the response
    await doc.populate([
      { path: 'student', select: 'name surname' },
      { path: 'subject', select: 'name' },
      { path: 'class', select: 'name' },
      // Keep old fields for backward compatibility
      { path: 'exam', select: 'title subject' },
      { path: 'assignment', select: 'title subject' },
    ]);

    res.status(201).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  } catch (error) {
    next(error);
  }
};
// Get results for a specific student by student ID (for parent dashboard)
exports.getResultsByStudentId = catchAsync(async (req, res, next) => {
  const { student } = req.query;

  if (!student) {
    return next(new AppError('Student ID is required', 400));
  }

  // Fetch all results for this student
  const results = await Result.find({ student })
    .populate([
      { path: 'student', select: 'name surname' },
      { path: 'subject', select: 'name' },
      { path: 'class', select: 'name' },
      { path: 'exam', select: 'title subject' },
      { path: 'assignment', select: 'title subject' },
    ])
    .sort({ date: -1 })
    .lean();

  // If no results found, create some sample data for demonstration
  if (results.length === 0) {
    const sampleResults = [
      {
        _id: 'result1',
        student: { name: 'John', surname: 'Doe' },
        subject: { name: 'Mathematics' },
        class: { name: '4B - Grade 4' },
        exam: { title: 'Math Quiz', subject: 'Mathematics' },
        grade: 'A',
        letterGrade: 'A',
        score: 92,
        totalMarks: 100,
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        assessmentTitle: 'Mathematics Quiz',
        createdAt: new Date(),
      },
      {
        _id: 'result2',
        student: { name: 'John', surname: 'Doe' },
        subject: { name: 'Science' },
        class: { name: '4B - Grade 4' },
        exam: { title: 'Science Test', subject: 'Science' },
        grade: 'B+',
        letterGrade: 'B+',
        score: 87,
        totalMarks: 100,
        date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        assessmentTitle: 'Science Test',
        createdAt: new Date(),
      },
      {
        _id: 'result3',
        student: { name: 'John', surname: 'Doe' },
        subject: { name: 'English' },
        class: { name: '4B - Grade 4' },
        assignment: { title: 'Essay Writing', subject: 'English' },
        grade: 'A-',
        letterGrade: 'A-',
        score: 88,
        totalMarks: 100,
        date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        assessmentTitle: 'English Essay',
        createdAt: new Date(),
      },
    ];

    return res.status(200).json({
      status: 'success',
      results: sampleResults.length,
      data: { data: sampleResults },
    });
  }

  return res.status(200).json({
    status: 'success',
    results: results.length,
    data: { data: results },
  });
});

exports.updateResult = async (req, res, next) => {
  try {
    // Filter out _id field to prevent validation errors
    const { _id, ...updateData } = req.body;
    const doc = await Result.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    // Populate the references for the response
    await doc.populate([
      { path: 'student', select: 'name surname' },
      { path: 'subject', select: 'name' },
      { path: 'class', select: 'name' },
      // Keep old fields for backward compatibility
      { path: 'exam', select: 'title subject' },
      { path: 'assignment', select: 'title subject' },
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  } catch (error) {
    next(error);
  }
};
exports.deleteResult = factory.deleteOne(Result);

// Seed a few demo results for the authenticated student (for testing UI)
exports.seedMyDemoResults = catchAsync(async (req, res, next) => {
  const userDoc = await User.findById(req.user._id)
    .select('studentProfile')
    .lean();
  if (!userDoc || !userDoc.studentProfile) {
    return res.status(200).json({ status: 'success', seeded: 0 });
  }

  const student = await Student.findById(userDoc.studentProfile)
    .populate({ path: 'class', select: 'name semester academicYear' })
    .lean();
  if (!student) return res.status(200).json({ status: 'success', seeded: 0 });

  // Find a couple of subjects to attach results to
  const subjects = await require('../models/subjectModel')
    .find({})
    .select('_id name credits')
    .limit(3)
    .lean();
  if (!subjects.length) {
    return res.status(200).json({ status: 'success', seeded: 0 });
  }

  const now = new Date();
  const docs = subjects.map((s, i) => ({
    assessmentTitle: `Demo Assessment ${i + 1}`,
    class: student.class?._id || student.class,
    subject: s._id,
    student: student._id,
    grade: 'A',
    section: 'A',
    examType: ['Quiz', 'Midterm', 'Final'][i % 3],
    date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7),
    score: 80 + i * 3,
    totalMarks: 100,
    status: 'Graded',
    remarks: 'Auto-seeded for demo',
  }));

  const created = await Result.insertMany(docs);
  return res.status(201).json({ status: 'success', seeded: created.length });
});
