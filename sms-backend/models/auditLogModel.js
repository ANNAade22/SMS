const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'LOGIN',
        'LOGOUT',
        'PASSWORD_CHANGE',
        'PROFILE_UPDATE',
        'USER_CREATE',
        'USER_UPDATE',
        'USER_DELETE',
        'PERMISSION_GRANT',
        'PERMISSION_REVOKE',
        'DEPARTMENT_ACCESS',
        'SESSION_START',
        'SESSION_END',
        'FAILED_LOGIN',
        'ACCOUNT_LOCK',
        'ACCOUNT_UNLOCK',
        'PASSWORD_RESET_REQUEST',
        'PASSWORD_RESET_SUCCESS',
        // Financial actions
        'FEE_CREATE',
        'FEE_UPDATE',
        'FEE_DELETE',
        'FEE_ASSIGNMENT_CREATE',
        'FEE_ASSIGNMENT_UPDATE',
        'FEE_ASSIGNMENT_DELETE',
        'FEE_ASSIGNMENT_BULK_CREATE',
        'PAYMENT_CREATE',
        'PAYMENT_UPDATE',
        'PAYMENT_DELETE',
        'PAYMENT_REFUND',
        'PAYMENT_REMINDER_CREATE',
        'PAYMENT_REMINDER_SENT',
        'PAYMENT_REMINDER_DISMISSED',
        'FINANCIAL_REPORT_GENERATED',
        'FINANCIAL_REPORT_EXPORTED',
        'BUDGET_CREATE',
        'BUDGET_UPDATE',
        'BUDGET_DELETE',
        'DISCOUNT_APPLIED',
        'SCHOLARSHIP_GRANTED',
        'SCHOLARSHIP_REVOKED',
        'FEE_WAIVER_GRANTED',
        'FEE_WAIVER_REVOKED',
      ],
    },
    resource: {
      type: String,
      enum: [
        'USER',
        'SESSION',
        'PERMISSION',
        'DEPARTMENT',
        'PROFILE',
        'SYSTEM',
        'FEE',
        'FEE_ASSIGNMENT',
        'PAYMENT',
        'PAYMENT_REMINDER',
        'FINANCIAL_REPORT',
        'BUDGET',
        'DISCOUNT',
        'SCHOLARSHIP',
      ],
      default: 'SYSTEM',
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'resourceModel',
    },
    resourceModel: {
      type: String,
      enum: [
        'User',
        'Session',
        'Fee',
        'FeeAssignment',
        'Payment',
        'PaymentReminder',
        'Budget',
        'Discount',
        'Scholarship',
      ],
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: String,
    userAgent: String,
    success: {
      type: Boolean,
      default: true,
    },
    errorMessage: String,
    timestamp: {
      type: Date,
      default: Date.now,
    },
    department: {
      type: String,
      enum: [
        'academic',
        'examination',
        'finance',
        'student_affairs',
        'it',
        'general',
      ],
    },
    role: {
      type: String,
      enum: [
        'super_admin',
        'school_admin',
        'academic_admin',
        'exam_admin',
        'finance_admin',
        'student_affairs_admin',
        'it_admin',
        'teacher',
        'student',
        'parent',
      ],
    },
  },
  {
    timestamps: true,
  },
);

// Index for efficient querying
auditLogSchema.index({ user: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ department: 1, timestamp: -1 });
auditLogSchema.index({ resource: 1, timestamp: -1 });

// Static method to log audit events
auditLogSchema.statics.logEvent = async function (data) {
  try {
    // Validate role enum before creating the document
    const validRoles = [
      'super_admin',
      'school_admin',
      'academic_admin',
      'exam_admin',
      'finance_admin',
      'student_affairs_admin',
      'it_admin',
      'teacher',
      'student',
      'parent',
    ];

    if (data.role && !validRoles.includes(data.role)) {
      console.warn(
        `Invalid role for audit log: ${data.role}. Setting to undefined.`,
      );
      data.role = undefined;
    }

    const logEntry = new this(data);
    await logEntry.save();
    return logEntry;
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw error to avoid breaking the main flow
    return null;
  }
};

// Method to get audit logs for a user
auditLogSchema.statics.getUserLogs = function (userId, options = {}) {
  const { limit = 50, skip = 0, action, startDate, endDate } = options;

  const query = { user: userId };

  if (action) query.action = action;
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = startDate;
    if (endDate) query.timestamp.$lte = endDate;
  }

  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .populate('user', 'username email profile.firstName profile.lastName');
};

// Method to get department logs
auditLogSchema.statics.getDepartmentLogs = function (department, options = {}) {
  const { limit = 50, skip = 0, action, startDate, endDate } = options;

  const query = { department };

  if (action) query.action = action;
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = startDate;
    if (endDate) query.timestamp.$lte = endDate;
  }

  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .populate('user', 'username email profile.firstName profile.lastName');
};

// Method to get system-wide logs
auditLogSchema.statics.getSystemLogs = function (options = {}) {
  const {
    limit = 100,
    skip = 0,
    action,
    user,
    department,
    startDate,
    endDate,
  } = options;

  const query = {};

  if (action) query.action = action;
  if (user) query.user = user;
  if (department) query.department = department;
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = startDate;
    if (endDate) query.timestamp.$lte = endDate;
  }

  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .populate('user', 'username email profile.firstName profile.lastName');
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
