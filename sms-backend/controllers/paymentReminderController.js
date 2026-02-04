const mongoose = require('mongoose');
const PaymentReminder = require('../models/paymentReminderModel');
const FeeAssignment = require('../models/feeAssignmentModel');
const Student = require('../models/studentModel');
const factory = require('./handlerFactory');

// Get all payment reminders with filtering and pagination
exports.getAllPaymentReminders = factory.getAll(PaymentReminder, [
  { path: 'student', select: 'name email studentCode' },
  {
    path: 'feeAssignment',
    populate: { path: 'fee', select: 'name category amount' },
  },
]);

// Get a single payment reminder
exports.getPaymentReminder = factory.getOne(PaymentReminder, [
  { path: 'student', select: 'name email studentCode' },
  {
    path: 'feeAssignment',
    populate: { path: 'fee', select: 'name category amount' },
  },
]);

// Get payment reminders by student
exports.getPaymentRemindersByStudent = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { isRead, isDismissed } = req.query;

    let filter = { student: studentId };

    if (isRead !== undefined) {
      filter.isRead = isRead === 'true';
    }

    if (isDismissed !== undefined) {
      filter.isDismissed = isDismissed === 'true';
    }

    const reminders = await PaymentReminder.find(filter)
      .populate('feeAssignment', 'fee dueDate remainingAmount')
      .populate('feeAssignment.fee', 'name category amount')
      .sort({ sentDate: -1 });

    res.status(200).json({
      status: 'success',
      results: reminders.length,
      data: {
        reminders,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Mark reminder as read
exports.markReminderAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const reminder = await PaymentReminder.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true },
    );

    if (!reminder) {
      return res.status(404).json({
        status: 'fail',
        message: 'Payment reminder not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        reminder,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Dismiss reminder
exports.dismissReminder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const reminder = await PaymentReminder.findByIdAndUpdate(
      id,
      { isDismissed: true },
      { new: true },
    );

    if (!reminder) {
      return res.status(404).json({
        status: 'fail',
        message: 'Payment reminder not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        reminder,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Mark all reminders as read for a student
exports.markAllRemindersAsRead = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    const result = await PaymentReminder.updateMany(
      { student: studentId, isRead: false },
      { isRead: true },
    );

    res.status(200).json({
      status: 'success',
      data: {
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get active reminders for student (for login popup)
exports.getActiveReminders = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    const reminders = await PaymentReminder.find({
      student: studentId,
      isDismissed: false,
    })
      .populate('feeAssignment', 'fee dueDate remainingAmount')
      .populate('feeAssignment.fee', 'name category amount')
      .sort({ priority: 1, sentDate: -1 });

    res.status(200).json({
      status: 'success',
      results: reminders.length,
      data: {
        reminders,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get reminder statistics
exports.getReminderStatistics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    let filter = {};
    if (startDate || endDate) {
      filter.sentDate = {};
      if (startDate) filter.sentDate.$gte = new Date(startDate);
      if (endDate) filter.sentDate.$lte = new Date(endDate);
    }

    const totalReminders = await PaymentReminder.countDocuments(filter);

    const remindersByType = await PaymentReminder.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$reminderType',
          count: { $sum: 1 },
          readCount: { $sum: { $cond: ['$isRead', 1, 0] } },
          dismissedCount: { $sum: { $cond: ['$isDismissed', 1, 0] } },
        },
      },
    ]);

    const remindersByPriority = await PaymentReminder.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 },
        },
      },
    ]);

    const unreadCount = await PaymentReminder.countDocuments({
      ...filter,
      isRead: false,
      isDismissed: false,
    });

    res.status(200).json({
      status: 'success',
      data: {
        statistics: {
          totalReminders,
          unreadCount,
          remindersByType,
          remindersByPriority,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// NEW: Create automated payment reminders for overdue fees
exports.createAutomatedReminders = async (req, res, next) => {
  try {
    const { reminderType = 'overdue', daysOverdue = 1 } = req.body;

    console.log(`Creating automated reminders for ${reminderType} fees...`);

    // Find overdue fee assignments
    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() - daysOverdue);

    const overdueAssignments = await FeeAssignment.find({
      dueDate: { $lt: overdueDate },
      remainingAmount: { $gt: 0 },
      isActive: true,
    })
      .populate('student', 'name email studentCode')
      .populate('fee', 'name category amount');

    console.log(`Found ${overdueAssignments.length} overdue fee assignments`);

    const reminders = [];
    const existingReminders = new Set();

    // Get existing reminders to avoid duplicates
    const existingReminderIds = await PaymentReminder.find({
      reminderType,
      sentDate: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
    }).distinct('feeAssignment');

    for (const assignment of overdueAssignments) {
      // Skip if reminder already sent in last 24 hours
      if (existingReminderIds.includes(assignment._id)) {
        continue;
      }

      const daysOverdueCount = Math.floor(
        (new Date() - assignment.dueDate) / (1000 * 60 * 60 * 24),
      );

      // Determine priority based on days overdue
      let priority = 'low';
      if (daysOverdueCount >= 30) priority = 'urgent';
      else if (daysOverdueCount >= 14) priority = 'high';
      else if (daysOverdueCount >= 7) priority = 'medium';

      const message = generateReminderMessage(
        assignment,
        reminderType,
        daysOverdueCount,
      );

      const reminder = new PaymentReminder({
        student: assignment.student._id,
        feeAssignment: assignment._id,
        reminderType,
        message,
        priority,
        daysOverdue: daysOverdueCount,
      });

      reminders.push(reminder);
    }

    if (reminders.length > 0) {
      await PaymentReminder.insertMany(reminders);
      console.log(`Created ${reminders.length} automated reminders`);
    }

    res.status(201).json({
      status: 'success',
      data: {
        remindersCreated: reminders.length,
        totalOverdue: overdueAssignments.length,
        message: `Successfully created ${reminders.length} automated reminders`,
      },
    });
  } catch (error) {
    console.error('Error creating automated reminders:', error);
    next(error);
  }
};

// NEW: Generate reminder message based on type and context
function generateReminderMessage(assignment, reminderType, daysOverdue) {
  const studentName = assignment.student.name || 'Student';
  const feeName = assignment.fee.name;
  const remainingAmount = assignment.remainingAmount;
  const dueDate = new Date(assignment.dueDate).toLocaleDateString();

  switch (reminderType) {
    case 'due_date':
      return `Dear ${studentName}, this is a friendly reminder that your ${feeName} fee of $${remainingAmount} is due on ${dueDate}. Please make payment to avoid any late fees.`;

    case 'overdue':
      if (daysOverdue === 1) {
        return `Dear ${studentName}, your ${feeName} fee of $${remainingAmount} was due on ${dueDate} and is now 1 day overdue. Please make payment as soon as possible.`;
      } else if (daysOverdue <= 7) {
        return `Dear ${studentName}, your ${feeName} fee of $${remainingAmount} is now ${daysOverdue} days overdue (due: ${dueDate}). Please make payment to avoid additional late fees.`;
      } else if (daysOverdue <= 30) {
        return `URGENT: Dear ${studentName}, your ${feeName} fee of $${remainingAmount} is now ${daysOverdue} days overdue (due: ${dueDate}). Immediate payment is required to avoid further consequences.`;
      } else {
        return `CRITICAL: Dear ${studentName}, your ${feeName} fee of $${remainingAmount} is now ${daysOverdue} days overdue (due: ${dueDate}). This account is seriously past due and requires immediate attention.`;
      }

    case 'login_reminder':
      return `Welcome back ${studentName}! You have ${assignment.remainingAmount > 0 ? 'outstanding fees' : 'no outstanding fees'}. ${assignment.remainingAmount > 0 ? `Please check your ${feeName} fee of $${remainingAmount}.` : 'Thank you for keeping your account current.'}`;

    default:
      return `Dear ${studentName}, please review your ${feeName} fee of $${remainingAmount} due on ${dueDate}.`;
  }
}

// NEW: Bulk create reminders for specific students or classes
exports.createBulkReminders = async (req, res, next) => {
  try {
    const {
      studentIds,
      classIds,
      reminderType = 'due_date',
      message,
    } = req.body;

    let targetStudents = [];

    // Get students based on criteria
    if (studentIds && studentIds.length > 0) {
      const students = await Student.find({ _id: { $in: studentIds } });
      targetStudents = students;
    } else if (classIds && classIds.length > 0) {
      const students = await Student.find({ class: { $in: classIds } });
      targetStudents = students;
    } else {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide either studentIds or classIds',
      });
    }

    console.log(
      `Creating bulk reminders for ${targetStudents.length} students`,
    );

    const reminders = [];
    const now = new Date();

    for (const student of targetStudents) {
      // Get active fee assignments for this student
      const assignments = await FeeAssignment.find({
        student: student._id,
        remainingAmount: { $gt: 0 },
        isActive: true,
      }).populate('fee', 'name category amount');

      for (const assignment of assignments) {
        const daysOverdue = Math.floor(
          (now - assignment.dueDate) / (1000 * 60 * 60 * 24),
        );

        const reminder = new PaymentReminder({
          student: student._id,
          feeAssignment: assignment._id,
          reminderType,
          message:
            message ||
            generateReminderMessage(assignment, reminderType, daysOverdue),
          priority: daysOverdue > 0 ? 'high' : 'medium',
          daysOverdue: Math.max(0, daysOverdue),
        });

        reminders.push(reminder);
      }
    }

    if (reminders.length > 0) {
      await PaymentReminder.insertMany(reminders);
      console.log(`Created ${reminders.length} bulk reminders`);
    }

    res.status(201).json({
      status: 'success',
      data: {
        remindersCreated: reminders.length,
        targetStudents: targetStudents.length,
        message: `Successfully created ${reminders.length} bulk reminders`,
      },
    });
  } catch (error) {
    console.error('Error creating bulk reminders:', error);
    next(error);
  }
};

// NEW: Get reminder analytics and insights
exports.getReminderAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate, studentId } = req.query;

    let matchFilter = {};
    if (startDate || endDate) {
      matchFilter.sentDate = {};
      if (startDate) matchFilter.sentDate.$gte = new Date(startDate);
      if (endDate) matchFilter.sentDate.$lte = new Date(endDate);
    }
    if (studentId) matchFilter.student = new mongoose.Types.ObjectId(studentId);

    const analytics = await PaymentReminder.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalReminders: { $sum: 1 },
          readReminders: { $sum: { $cond: ['$isRead', 1, 0] } },
          dismissedReminders: { $sum: { $cond: ['$isDismissed', 1, 0] } },
          avgDaysOverdue: { $avg: '$daysOverdue' },
          urgentReminders: {
            $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] },
          },
          highPriorityReminders: {
            $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] },
          },
        },
      },
    ]);

    const remindersByType = await PaymentReminder.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$reminderType',
          count: { $sum: 1 },
          readRate: {
            $avg: { $cond: ['$isRead', 1, 0] },
          },
          dismissalRate: {
            $avg: { $cond: ['$isDismissed', 1, 0] },
          },
        },
      },
    ]);

    const remindersByPriority = await PaymentReminder.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 },
          avgDaysOverdue: { $avg: '$daysOverdue' },
        },
      },
    ]);

    const recentReminders = await PaymentReminder.find(matchFilter)
      .populate('student', 'name email studentCode')
      .populate('feeAssignment', 'fee dueDate remainingAmount')
      .populate('feeAssignment.fee', 'name category amount')
      .sort({ sentDate: -1 })
      .limit(10);

    res.status(200).json({
      status: 'success',
      data: {
        analytics: analytics[0] || {
          totalReminders: 0,
          readReminders: 0,
          dismissedReminders: 0,
          avgDaysOverdue: 0,
          urgentReminders: 0,
          highPriorityReminders: 0,
        },
        remindersByType,
        remindersByPriority,
        recentReminders,
      },
    });
  } catch (error) {
    console.error('Error getting reminder analytics:', error);
    next(error);
  }
};
