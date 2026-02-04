// controllers/dashboardController.js
const User = require('../models/userModel');
const Student = require('../models/studentModel');
const Teacher = require('../models/teacherModel');
const Class = require('../models/classModel');
const Subject = require('../models/subjectModel');
const Attendance = require('../models/attendanceModel');
const Exam = require('../models/examModel');
const Result = require('../models/resultModel');
const AuditLog = require('../models/auditLogModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Removed getDashboardStats: simple counts now provided via /<resource>/count endpoints.

// Get recent activities
exports.getRecentActivities = catchAsync(async (req, res, next) => {
  const limit = parseInt(req.query.limit) || 10;

  // Get recent audit logs
  const activities = await AuditLog.find()
    .populate('user', 'name role')
    .sort({ createdAt: -1 })
    .limit(limit);

  // Transform activities for frontend
  const formattedActivities = activities.map((activity) => ({
    id: activity._id,
    action: activity.action,
    description: activity.description,
    user: activity.user ? activity.user.name : 'System',
    userRole: activity.user ? activity.user.role : 'system',
    timestamp: activity.createdAt,
    type: activity.actionType || 'info',
  }));

  res.status(200).json({
    status: 'success',
    data: {
      activities: formattedActivities,
    },
  });
});

// Get user statistics by role
exports.getUserStats = catchAsync(async (req, res, next) => {
  const [adminCount, teacherCount, studentCount, parentCount] =
    await Promise.all([
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ role: 'teacher' }),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'parent' }),
    ]);

  const userStats = {
    labels: ['Admins', 'Teachers', 'Students', 'Parents'],
    datasets: [
      {
        data: [adminCount, teacherCount, studentCount, parentCount],
        backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
        borderColor: ['#1E40AF', '#059669', '#D97706', '#DC2626'],
      },
    ],
  };

  res.status(200).json({
    status: 'success',
    data: {
      userStats,
    },
  });
});

// Get class distribution
exports.getClassDistribution = catchAsync(async (req, res, next) => {
  const classes = await Class.find()
    .populate('students', 'name')
    .populate('supervisor', 'name');

  const classData = classes.map((cls) => ({
    name: cls.name,
    studentCount: cls.students ? cls.students.length : 0,
    teacher: cls.supervisor ? cls.supervisor.name : 'Not assigned',
  }));

  const classDistribution = {
    labels: classData.map((cls) => cls.name),
    datasets: [
      {
        label: 'Students per Class',
        data: classData.map((cls) => cls.studentCount),
        backgroundColor: '#3B82F6',
        borderColor: '#1E40AF',
      },
    ],
  };

  res.status(200).json({
    status: 'success',
    data: {
      classDistribution,
      classDetails: classData,
    },
  });
});

// Get performance metrics
exports.getPerformanceMetrics = catchAsync(async (req, res, next) => {
  // Get grade distribution from results
  const results = await Result.find().select('score totalMarks');

  const gradeRanges = {
    '90-100': 0,
    '80-89': 0,
    '70-79': 0,
    '60-69': 0,
    '0-59': 0,
  };

  results.forEach((result) => {
    // Calculate percentage score
    const percentage = (result.score / result.totalMarks) * 100;
    if (percentage >= 90) gradeRanges['90-100']++;
    else if (percentage >= 80) gradeRanges['80-89']++;
    else if (percentage >= 70) gradeRanges['70-79']++;
    else if (percentage >= 60) gradeRanges['60-69']++;
    else gradeRanges['0-59']++;
  });

  const performanceMetrics = {
    labels: Object.keys(gradeRanges),
    datasets: [
      {
        label: 'Grade Distribution',
        data: Object.values(gradeRanges),
        backgroundColor: [
          '#10B981',
          '#3B82F6',
          '#F59E0B',
          '#EF4444',
          '#6B7280',
        ],
      },
    ],
  };

  res.status(200).json({
    status: 'success',
    data: {
      performanceMetrics,
    },
  });
});

// Get attendance overview
exports.getAttendanceOverview = catchAsync(async (req, res, next) => {
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    last7Days.push(date);
  }

  const attendanceData = await Promise.all(
    last7Days.map(async (date) => {
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      const dayAttendance = await Attendance.find({
        date: { $gte: date, $lt: nextDay },
      });

      const present = dayAttendance.filter(
        (att) => att.status === 'present',
      ).length;
      const absent = dayAttendance.filter(
        (att) => att.status === 'absent',
      ).length;

      return {
        date: date.toISOString().split('T')[0],
        present,
        absent,
        total: present + absent,
      };
    }),
  );

  const attendanceOverview = {
    labels: attendanceData.map((day) => {
      const date = new Date(day.date);
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    }),
    datasets: [
      {
        label: 'Present',
        data: attendanceData.map((day) => day.present),
        backgroundColor: '#10B981',
      },
      {
        label: 'Absent',
        data: attendanceData.map((day) => day.absent),
        backgroundColor: '#EF4444',
      },
    ],
  };

  res.status(200).json({
    status: 'success',
    data: {
      attendanceOverview,
      attendanceData,
    },
  });
});
