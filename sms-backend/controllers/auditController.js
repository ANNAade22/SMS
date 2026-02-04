const AuditLog = require('./../models/auditLogModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

// Get audit logs for current user
exports.getMyAuditLogs = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20, action, startDate, endDate } = req.query;

  const options = {
    limit: parseInt(limit),
    skip: (parseInt(page) - 1) * parseInt(limit),
    action,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
  };

  const logs = await AuditLog.getUserLogs(req.user._id, options);

  res.status(200).json({
    status: 'success',
    results: logs.length,
    data: {
      logs,
    },
  });
});

// Get audit logs for a specific user (admin only)
exports.getUserAuditLogs = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const { page = 1, limit = 20, action, startDate, endDate } = req.query;

  const options = {
    limit: parseInt(limit),
    skip: (parseInt(page) - 1) * parseInt(limit),
    action,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
  };

  const logs = await AuditLog.getUserLogs(userId, options);

  res.status(200).json({
    status: 'success',
    results: logs.length,
    data: {
      logs,
    },
  });
});

// Get department audit logs
exports.getDepartmentAuditLogs = catchAsync(async (req, res, next) => {
  const { department } = req.params;
  const { page = 1, limit = 20, action, startDate, endDate } = req.query;

  // Check if user can access this department
  if (!req.user.canAccessDepartment(department)) {
    return next(
      new AppError(
        `You don't have permission to view ${department} department logs`,
        403,
      ),
    );
  }

  const options = {
    limit: parseInt(limit),
    skip: (parseInt(page) - 1) * parseInt(limit),
    action,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
  };

  const logs = await AuditLog.getDepartmentLogs(department, options);

  res.status(200).json({
    status: 'success',
    results: logs.length,
    data: {
      logs,
    },
  });
});

// Get system-wide audit logs (super admin and IT admin only)
exports.getSystemAuditLogs = catchAsync(async (req, res, next) => {
  const {
    page = 1,
    limit = 50,
    action,
    user,
    department,
    startDate,
    endDate,
    search,
    sortBy = 'timestamp',
    sortOrder = 'desc',
  } = req.query;

  const query = {};

  if (action) query.action = action;
  if (user) query.user = user;
  if (department) query.department = department;
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  // Add search functionality
  if (search) {
    query.$or = [
      { action: { $regex: search, $options: 'i' } },
      { 'user.username': { $regex: search, $options: 'i' } },
      { 'user.profile.firstName': { $regex: search, $options: 'i' } },
      { 'user.profile.lastName': { $regex: search, $options: 'i' } },
      { ipAddress: { $regex: search, $options: 'i' } },
    ];
  }

  // Calculate pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skipNum = (pageNum - 1) * limitNum;

  // Sort configuration
  const sortConfig = {};
  sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const logs = await AuditLog.find(query)
    .sort(sortConfig)
    .limit(limitNum)
    .skip(skipNum)
    .populate(
      'user',
      'username email profile.firstName profile.lastName department role',
    );

  const total = await AuditLog.countDocuments(query);

  res.status(200).json({
    status: 'success',
    results: logs.length,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
    data: {
      logs,
    },
  });
});

// Get filter options for audit logs
exports.getFilterOptions = catchAsync(async (req, res, next) => {
  // Get unique actions
  const actions = await AuditLog.distinct('action');

  // Get unique departments
  const departments = await AuditLog.distinct('department');

  // Get users who have audit logs
  const users = await AuditLog.aggregate([
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'userInfo',
      },
    },
    {
      $unwind: '$userInfo',
    },
    {
      $group: {
        _id: '$user',
        username: { $first: '$userInfo.username' },
        profile: {
          $first: {
            firstName: '$userInfo.profile.firstName',
            lastName: '$userInfo.profile.lastName',
          },
        },
      },
    },
    {
      $project: {
        _id: 1,
        username: 1,
        profile: 1,
      },
    },
    {
      $sort: { username: 1 },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      actions: actions.sort(),
      departments: departments.filter(Boolean).sort(),
      users,
    },
  });
});

// Get audit statistics
exports.getAuditStats = catchAsync(async (req, res, next) => {
  const { startDate, endDate } = req.query;

  const dateFilter = {};
  if (startDate || endDate) {
    dateFilter.timestamp = {};
    if (startDate) dateFilter.timestamp.$gte = new Date(startDate);
    if (endDate) dateFilter.timestamp.$lte = new Date(endDate);
  }

  // Get action counts
  const actionStats = await AuditLog.aggregate([
    { $match: dateFilter },
    { $group: { _id: '$action', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  // Get department stats
  const departmentStats = await AuditLog.aggregate([
    { $match: { ...dateFilter, department: { $exists: true } } },
    { $group: { _id: '$department', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  // Get failed actions
  const failedActions = await AuditLog.countDocuments({
    ...dateFilter,
    success: false,
  });

  // Get recent logs
  const recentLogs = await AuditLog.find(dateFilter)
    .sort({ timestamp: -1 })
    .limit(10)
    .populate('user', 'username email profile.firstName profile.lastName');

  res.status(200).json({
    status: 'success',
    data: {
      actionStats,
      departmentStats,
      failedActions,
      recentLogs,
    },
  });
});

// Log custom audit event
exports.logCustomEvent = catchAsync(async (req, res, next) => {
  const { action, resource, details, success = true } = req.body;

  if (!action) {
    return next(new AppError('Action is required', 400));
  }

  await AuditLog.logEvent({
    user: req.user._id,
    action,
    resource: resource || 'SYSTEM',
    details,
    success,
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    department: req.user.department,
    role: req.user.role,
  });

  res.status(201).json({
    status: 'success',
    message: 'Audit event logged successfully',
  });
});
