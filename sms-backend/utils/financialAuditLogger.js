const AuditLog = require('../models/auditLogModel');

/**
 * Financial Audit Logger
 * Logs all financial actions for compliance and tracking
 */

// Log fee-related actions
exports.logFeeAction = async (action, user, feeId, details = {}) => {
  try {
    await AuditLog.logEvent({
      user: user._id,
      action: `FEE_${action.toUpperCase()}`,
      resource: 'FEE',
      resourceId: feeId,
      resourceModel: 'Fee',
      details: {
        ...details,
        timestamp: new Date(),
      },
      department: 'finance',
      role: user.role,
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
    });
  } catch (error) {
    console.error('Failed to log fee action:', error);
  }
};

// Log fee assignment actions
exports.logFeeAssignmentAction = async (
  action,
  user,
  assignmentId,
  details = {},
) => {
  try {
    await AuditLog.logEvent({
      user: user._id,
      action: `FEE_ASSIGNMENT_${action.toUpperCase()}`,
      resource: 'FEE_ASSIGNMENT',
      resourceId: assignmentId,
      resourceModel: 'FeeAssignment',
      details: {
        ...details,
        timestamp: new Date(),
      },
      department: 'finance',
      role: user.role,
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
    });
  } catch (error) {
    console.error('Failed to log fee assignment action:', error);
  }
};

// Log payment actions
exports.logPaymentAction = async (action, user, paymentId, details = {}) => {
  try {
    await AuditLog.logEvent({
      user: user._id,
      action: `PAYMENT_${action.toUpperCase()}`,
      resource: 'PAYMENT',
      resourceId: paymentId,
      resourceModel: 'Payment',
      details: {
        ...details,
        timestamp: new Date(),
      },
      department: 'finance',
      role: user.role,
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
    });
  } catch (error) {
    console.error('Failed to log payment action:', error);
  }
};

// Log payment reminder actions
exports.logReminderAction = async (action, user, reminderId, details = {}) => {
  try {
    await AuditLog.logEvent({
      user: user._id,
      action: `PAYMENT_REMINDER_${action.toUpperCase()}`,
      resource: 'PAYMENT_REMINDER',
      resourceId: reminderId,
      resourceModel: 'PaymentReminder',
      details: {
        ...details,
        timestamp: new Date(),
      },
      department: 'finance',
      role: user.role,
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
    });
  } catch (error) {
    console.error('Failed to log reminder action:', error);
  }
};

// Log financial report actions
exports.logReportAction = async (action, user, reportType, details = {}) => {
  try {
    await AuditLog.logEvent({
      user: user._id,
      action: `FINANCIAL_REPORT_${action.toUpperCase()}`,
      resource: 'FINANCIAL_REPORT',
      details: {
        reportType,
        ...details,
        timestamp: new Date(),
      },
      department: 'finance',
      role: user.role,
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
    });
  } catch (error) {
    console.error('Failed to log report action:', error);
  }
};

// Log bulk operations
exports.logBulkAction = async (action, user, operationType, details = {}) => {
  try {
    await AuditLog.logEvent({
      user: user._id,
      action: `${operationType.toUpperCase()}_BULK_${action.toUpperCase()}`,
      resource: operationType.toUpperCase(),
      details: {
        ...details,
        timestamp: new Date(),
        bulkOperation: true,
      },
      department: 'finance',
      role: user.role,
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
    });
  } catch (error) {
    console.error('Failed to log bulk action:', error);
  }
};

// Get financial audit logs
exports.getFinancialAuditLogs = async (options = {}) => {
  try {
    const {
      startDate,
      endDate,
      action,
      user,
      resource,
      limit = 100,
      skip = 0,
    } = options;

    const query = { department: 'finance' };

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    if (action) query.action = action;
    if (user) query.user = user;
    if (resource) query.resource = resource;

    const logs = await AuditLog.find(query)
      .populate('user', 'username email profile.firstName profile.lastName')
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip);

    const total = await AuditLog.countDocuments(query);

    return {
      logs,
      total,
      hasMore: skip + logs.length < total,
    };
  } catch (error) {
    console.error('Failed to get financial audit logs:', error);
    throw error;
  }
};

// Get financial audit statistics
exports.getFinancialAuditStats = async (options = {}) => {
  try {
    const { startDate, endDate } = options;

    let matchFilter = { department: 'finance' };
    if (startDate || endDate) {
      matchFilter.timestamp = {};
      if (startDate) matchFilter.timestamp.$gte = new Date(startDate);
      if (endDate) matchFilter.timestamp.$lte = new Date(endDate);
    }

    const stats = await AuditLog.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalActions: { $sum: 1 },
          actionsByType: {
            $push: {
              action: '$action',
              resource: '$resource',
              timestamp: '$timestamp',
            },
          },
        },
      },
    ]);

    const actionsByResource = await AuditLog.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$resource',
          count: { $sum: 1 },
        },
      },
    ]);

    const actionsByUser = await AuditLog.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$user',
          count: { $sum: 1 },
          actions: { $addToSet: '$action' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo',
        },
      },
      {
        $unwind: '$userInfo',
      },
      {
        $project: {
          username: '$userInfo.username',
          email: '$userInfo.email',
          count: 1,
          actions: 1,
        },
      },
    ]);

    const recentActions = await AuditLog.find(matchFilter)
      .populate('user', 'username email profile.firstName profile.lastName')
      .sort({ timestamp: -1 })
      .limit(10);

    return {
      totalActions: stats[0]?.totalActions || 0,
      actionsByResource,
      actionsByUser,
      recentActions,
    };
  } catch (error) {
    console.error('Failed to get financial audit stats:', error);
    throw error;
  }
};
