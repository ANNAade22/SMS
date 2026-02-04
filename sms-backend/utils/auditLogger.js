// src/utils/auditLogger.js
const AuditLog = require('../models/auditLogModel');

const safeAuditLog = async (data) => {
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

    const logEntry = new AuditLog(data);
    await logEntry.save();
    return logEntry;
  } catch (error) {
    console.error('Failed to log audit event:', error.message);
    // Don't throw error to avoid breaking the main flow
    return null;
  }
};

module.exports = safeAuditLog;
