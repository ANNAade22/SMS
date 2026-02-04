const Session = require('./../models/sessionModel');
const AuditLog = require('./../models/auditLogModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

// Get current user's active sessions
exports.getMySessions = catchAsync(async (req, res, next) => {
  const sessions = await Session.getUserActiveSessions(req.user._id);

  res.status(200).json({
    status: 'success',
    results: sessions.length,
    data: {
      sessions,
    },
  });
});

// Get all active sessions (admin only)
exports.getAllActiveSessions = catchAsync(async (req, res, next) => {
  const sessions = await Session.find({
    isActive: true,
    expiresAt: { $gt: new Date() },
  })
    .populate(
      'user',
      'username email profile.firstName profile.lastName department role',
    )
    .sort({ lastActivity: -1 });

  res.status(200).json({
    status: 'success',
    results: sessions.length,
    data: {
      sessions,
    },
  });
});

// Get sessions by userId (admin only)
exports.getSessionsByUserId = catchAsync(async (req, res, next) => {
  const { userId } = req.query;

  if (!userId) {
    return next(new AppError('userId is required', 400));
  }

  const sessions = await Session.find({
    user: userId,
    isActive: true,
    expiresAt: { $gt: new Date() },
  })
    .populate(
      'user',
      'username email profile.firstName profile.lastName department role',
    )
    .sort({ lastActivity: -1 });

  res.status(200).json({
    status: 'success',
    results: sessions.length,
    data: {
      sessions,
    },
  });
});

// Get active sessions for admins + teachers only (admin view)
exports.getAdminTeacherSessions = catchAsync(async (req, res, next) => {
  // Only allow higher privileged roles
  if (!['super_admin', 'school_admin', 'it_admin'].includes(req.user.role)) {
    return next(new AppError('Forbidden', 403));
  }
  const sessions = await Session.find({
    isActive: true,
    expiresAt: { $gt: new Date() },
  })
    .populate(
      'user',
      'username email profile.firstName profile.lastName department role',
    )
    .sort({ lastActivity: -1 });

  const filtered = sessions.filter((s) =>
    [
      'teacher',
      'super_admin',
      'school_admin',
      'academic_admin',
      'exam_admin',
      'finance_admin',
      'student_affairs_admin',
      'it_admin',
    ].includes(s.user?.role),
  );

  res.status(200).json({
    status: 'success',
    results: filtered.length,
    data: { sessions: filtered },
  });
});

// Invalidate a specific session
exports.invalidateSession = catchAsync(async (req, res, next) => {
  const { sessionId } = req.params;

  const session = await Session.findOne({ sessionId });

  if (!session) {
    return next(new AppError('Session not found', 404));
  }

  // Check if user can invalidate this session
  if (
    req.user.role !== 'super_admin' &&
    req.user.role !== 'it_admin' &&
    session.user.toString() !== req.user._id.toString()
  ) {
    return next(new AppError('You can only invalidate your own sessions', 403));
  }

  await session.invalidate();

  // Log the session invalidation
  await AuditLog.logEvent({
    user: req.user._id,
    action: 'SESSION_END',
    resource: 'SESSION',
    resourceId: session._id,
    resourceModel: 'Session',
    details: { invalidatedBy: req.user._id, sessionId },
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    department: req.user.department,
    role: req.user.role,
  });

  res.status(200).json({
    status: 'success',
    message: 'Session invalidated successfully',
  });
});

// Invalidate all sessions for current user
exports.invalidateAllMySessions = catchAsync(async (req, res, next) => {
  const result = await Session.invalidateUserSessions(req.user._id);

  // Log the session invalidation
  await AuditLog.logEvent({
    user: req.user._id,
    action: 'SESSION_END',
    resource: 'SESSION',
    details: {
      action: 'invalidate_all_sessions',
      sessionsInvalidated: result.modifiedCount,
    },
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    department: req.user.department,
    role: req.user.role,
  });

  res.status(200).json({
    status: 'success',
    message: `${result.modifiedCount} sessions invalidated successfully`,
  });
});

// Invalidate all sessions for a user (admin only)
exports.invalidateUserSessions = catchAsync(async (req, res, next) => {
  const { userId } = req.params;

  const result = await Session.invalidateUserSessions(userId);

  // Log the session invalidation
  await AuditLog.logEvent({
    user: req.user._id,
    action: 'SESSION_END',
    resource: 'SESSION',
    details: {
      targetUser: userId,
      action: 'admin_invalidate_all_sessions',
      sessionsInvalidated: result.modifiedCount,
    },
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    department: req.user.department,
    role: req.user.role,
  });

  res.status(200).json({
    status: 'success',
    message: `${result.modifiedCount} sessions invalidated successfully`,
  });
});

// Clean expired sessions (admin only)
exports.cleanExpiredSessions = catchAsync(async (req, res, next) => {
  const result = await Session.cleanExpiredSessions();

  res.status(200).json({
    status: 'success',
    message: `${result.modifiedCount} expired sessions cleaned`,
  });
});

// Get session statistics
exports.getSessionStats = catchAsync(async (req, res, next) => {
  const totalActive = await Session.countDocuments({
    isActive: true,
    expiresAt: { $gt: new Date() },
  });

  const totalExpired = await Session.countDocuments({
    isActive: false,
    expiresAt: { $lt: new Date() },
  });

  // Get sessions by department
  const departmentStats = await Session.aggregate([
    { $match: { isActive: true, expiresAt: { $gt: new Date() } } },
    { $group: { _id: '$department', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  // Get recent sessions
  const recentSessions = await Session.find({
    isActive: true,
    expiresAt: { $gt: new Date() },
  })
    .populate('user', 'username email profile.firstName profile.lastName')
    .sort({ lastActivity: -1 })
    .limit(10);

  res.status(200).json({
    status: 'success',
    data: {
      totalActive,
      totalExpired,
      departmentStats,
      recentSessions,
    },
  });
});

// Middleware to update session activity
exports.updateSessionActivity = catchAsync(async (req, res, next) => {
  // Skip for auth routes and static files
  if (req.path.startsWith('/api/v1/auth') || req.path.includes('.')) {
    return next();
  }

  if (req.user && req.session) {
    await req.session.updateActivity();
  }

  next();
});

// Middleware to validate session
exports.validateSession = catchAsync(async (req, res, next) => {
  // Only enforce session checks after auth has populated req.user
  if (!req.user) return next();

  // Ensure we have the bearer token on the request (fallback extraction)
  if (!req.token && req.headers && req.headers.authorization) {
    const auth = req.headers.authorization;
    if (auth.startsWith('Bearer ')) req.token = auth.split(' ')[1];
  }

  // Try to find an active session for this token
  let session = req.token ? await Session.findActiveByToken(req.token) : null;

  // If no active session exists but JWT is valid (req.user set), create one on-the-fly
  if (!session) {
    // Gracefully create a session for this valid JWT instead of failing with 401
    session = await Session.createSession(req.user, req.token, req);
  }

  // If session could still not be created/found, treat as unauthorized
  if (!session) {
    return next(new AppError('Session expired or invalid', 401));
  }

  req.session = session;
  next();
});
