const SecurityEvent = require('./../models/securityEventModel');
const PasswordPolicy = require('./../models/passwordPolicyModel');
const User = require('./../models/userModel');
const AuditLog = require('./../models/auditLogModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

// Get security events
exports.getSecurityEvents = catchAsync(async (req, res, next) => {
  const {
    page = 1,
    limit = 20,
    type,
    severity,
    user,
    startDate,
    endDate,
    resolved,
  } = req.query;

  const query = {};

  if (type) query.type = type;
  if (severity) query.severity = severity;
  if (user) query.user = user;
  if (resolved !== undefined) query.isResolved = resolved === 'true';

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  // Check permissions
  if (!req.user.canAccessDepartment('it') && req.user.role !== 'super_admin') {
    query.user = req.user._id; // Users can only see their own security events
  }

  const events = await SecurityEvent.find(query)
    .sort({ timestamp: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit))
    .populate('user', 'username email profile.firstName profile.lastName')
    .populate('resolvedBy', 'username')
    .populate('actions.performedBy', 'username');

  const total = await SecurityEvent.countDocuments(query);

  res.status(200).json({
    status: 'success',
    results: events.length,
    total,
    totalPages: Math.ceil(total / parseInt(limit)),
    currentPage: parseInt(page),
    data: {
      events,
    },
  });
});

// Get high-risk security events
exports.getHighRiskEvents = catchAsync(async (req, res, next) => {
  const events = await SecurityEvent.getHighRiskEvents({
    limit: 50,
    startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
    endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
  });

  res.status(200).json({
    status: 'success',
    results: events.length,
    data: {
      events,
    },
  });
});

// Get security statistics
exports.getSecurityStats = catchAsync(async (req, res, next) => {
  const timeframe = parseInt(req.query.timeframe) || 30; // Default 30 days

  const stats = await SecurityEvent.getSecurityStats(timeframe);

  // Get additional stats
  const totalEvents = await SecurityEvent.countDocuments({
    timestamp: { $gte: new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000) },
  });

  const unresolvedHighRisk = await SecurityEvent.countDocuments({
    severity: { $in: ['HIGH', 'CRITICAL'] },
    isResolved: false,
    timestamp: { $gte: new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000) },
  });

  const topThreatTypes = await SecurityEvent.aggregate([
    {
      $match: {
        timestamp: {
          $gte: new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000),
        },
      },
    },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        avgRiskScore: { $avg: '$riskScore' },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      timeframe,
      totalEvents,
      unresolvedHighRisk,
      severityBreakdown: stats,
      topThreatTypes,
    },
  });
});

// Resolve security event
exports.resolveSecurityEvent = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { action, notes } = req.body;

  const event = await SecurityEvent.findById(id);

  if (!event) {
    return next(new AppError('Security event not found', 404));
  }

  event.isResolved = true;
  event.resolvedAt = new Date();
  event.resolvedBy = req.user._id;

  if (action) {
    event.actions.push({
      action,
      performedBy: req.user._id,
      notes,
    });
  }

  await event.save();

  // Log the resolution
  await AuditLog.logEvent({
    user: req.user._id,
    action: 'SECURITY_EVENT_RESOLVED',
    resource: 'SECURITY',
    resourceId: event._id,
    resourceModel: 'SecurityEvent',
    details: { eventType: event.type, action, notes },
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    department: req.user.department,
    role: req.user.role,
    success: true,
  });

  res.status(200).json({
    status: 'success',
    message: 'Security event resolved successfully',
    data: {
      event,
    },
  });
});

// Get password policies
exports.getPasswordPolicies = catchAsync(async (req, res, next) => {
  const policies = await PasswordPolicy.find({ isActive: true })
    .populate('createdBy', 'username')
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: policies.length,
    data: {
      policies,
    },
  });
});

// Create password policy
exports.createPasswordPolicy = catchAsync(async (req, res, next) => {
  const policy = await PasswordPolicy.create({
    ...req.body,
    createdBy: req.user._id,
  });

  res.status(201).json({
    status: 'success',
    data: {
      policy,
    },
  });
});

// Update password policy
exports.updatePasswordPolicy = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const policy = await PasswordPolicy.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!policy) {
    return next(new AppError('Password policy not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      policy,
    },
  });
});

// Validate password against policy
exports.validatePassword = catchAsync(async (req, res, next) => {
  const { password, userId } = req.body;

  let user = null;
  if (userId) {
    user = await User.findById(userId).select('username email profile');
  }

  const policy = await PasswordPolicy.getApplicablePolicy(
    user || { role: 'student' },
  );

  const validation = PasswordPolicy.validatePassword(
    password,
    user,
    policy?.rules,
  );

  // Check password history if user provided
  let historyCheck = { isValid: true };
  if (userId) {
    historyCheck = await PasswordPolicy.checkPasswordHistory(userId, password);
  }

  const finalResult = {
    isValid: validation.isValid && historyCheck.isValid,
    errors: [
      ...validation.errors,
      ...(historyCheck.error ? [historyCheck.error] : []),
    ],
  };

  res.status(200).json({
    status: 'success',
    data: {
      validation: finalResult,
      policy: policy?.rules,
    },
  });
});

// Middleware to detect suspicious activity
exports.detectSuspiciousActivity = catchAsync(async (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');
  const now = new Date();

  // Check for rapid requests (potential DoS)
  const recentRequests = await SecurityEvent.countDocuments({
    ipAddress: ip,
    type: 'RATE_LIMIT_EXCEEDED',
    timestamp: { $gte: new Date(now.getTime() - 5 * 60 * 1000) }, // Last 5 minutes
  });

  if (recentRequests > 10) {
    await SecurityEvent.logSecurityEvent({
      type: 'POTENTIAL_ATTACK',
      severity: 'CRITICAL',
      ipAddress: ip,
      userAgent,
      details: {
        reason: 'High frequency of rate limit violations',
        requestCount: recentRequests,
      },
    });
  }

  // Check for unusual login times (if user is logged in)
  if (req.user) {
    const hour = now.getHours();
    const isUnusualTime = hour < 6 || hour > 22; // Outside 6 AM - 10 PM

    if (isUnusualTime) {
      await SecurityEvent.logSecurityEvent({
        type: 'UNUSUAL_LOGIN_TIME',
        user: req.user._id,
        ipAddress: ip,
        userAgent,
        details: { loginHour: hour },
        riskScore: 45,
      });
    }
  }

  next();
});

// Middleware to log failed authentication attempts
exports.logFailedAuth = catchAsync(async (req, res, next) => {
  // This will be called when authentication fails
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');

  // Check for brute force attempts
  const recentFailures = await SecurityEvent.countDocuments({
    ipAddress: ip,
    type: 'BRUTE_FORCE_ATTEMPT',
    timestamp: { $gte: new Date(Date.now() - 15 * 60 * 1000) }, // Last 15 minutes
  });

  if (recentFailures >= 5) {
    await SecurityEvent.logSecurityEvent({
      type: 'BRUTE_FORCE_ATTEMPT',
      ipAddress: ip,
      userAgent,
      details: {
        recentFailures,
        potentialBruteForce: true,
      },
      riskScore: 70,
    });
  }

  next();
});
