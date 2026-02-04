const mongoose = require('mongoose');
const FeeAssignment = require('../models/feeAssignmentModel');
const Fee = require('../models/feeModel');
const Student = require('../models/studentModel');
const PaymentReminder = require('../models/paymentReminderModel');
const factory = require('./handlerFactory');
const financialAuditLogger = require('../utils/financialAuditLogger');

// Get all fee assignments with filtering and pagination
exports.getAllFeeAssignments = factory.getAll(FeeAssignment, [
  { path: 'student', select: 'name email studentCode' },
  { path: 'fee', select: 'name category amount' },
  { path: 'assignedBy', select: 'profile.firstName profile.lastName' },
]);

// Get a single fee assignment
exports.getFeeAssignment = factory.getOne(FeeAssignment, [
  { path: 'student', select: 'name email studentCode' },
  { path: 'fee', select: 'name category amount' },
  { path: 'assignedBy', select: 'profile.firstName profile.lastName' },
]);

// Create bulk fee assignments
exports.createBulkFeeAssignments = async (req, res, next) => {
  try {
    const {
      feeId,
      assignedAmount,
      dueDate,
      notes,
      assignTo,
      classIds = [],
      gradeIds = [],
      studentIds = [],
    } = req.body;

    // Verify fee exists
    const fee = await Fee.findById(feeId);
    if (!fee) {
      return res.status(404).json({
        status: 'fail',
        message: 'Fee not found',
      });
    }

    let targetStudents = [];

    // Determine target students based on assignTo type
    console.log('Bulk assignment request:', {
      assignTo,
      classIds,
      gradeIds,
      studentIds,
    });

    if (assignTo === 'all') {
      // Get all students
      console.log('Fetching all students...');
      const allStudents = await Student.find({});
      console.log('Raw student query result:', allStudents.length);
      console.log('First few students:', allStudents.slice(0, 3));
      targetStudents = allStudents;
      console.log(`Found ${targetStudents.length} students`);
    } else if (assignTo === 'classes' && classIds.length > 0) {
      // Get students from specific classes
      console.log('Fetching students from classes:', classIds);
      targetStudents = await Student.find({
        class: { $in: classIds },
      });
      console.log(
        `Found ${targetStudents.length} students in specified classes`,
      );
    } else if (assignTo === 'grades' && gradeIds.length > 0) {
      // Get students from specific grades
      console.log('Fetching students from grades:', gradeIds);
      targetStudents = await Student.find({
        grade: { $in: gradeIds },
      });
      console.log(
        `Found ${targetStudents.length} students in specified grades`,
      );
    } else if (assignTo === 'students' && studentIds.length > 0) {
      // Get specific students
      console.log('Fetching specific students:', studentIds);
      targetStudents = await Student.find({
        _id: { $in: studentIds },
      });
      console.log(`Found ${targetStudents.length} specific students`);
    }

    if (targetStudents.length === 0) {
      console.log('No students found for criteria:', {
        assignTo,
        classIds,
        gradeIds,
        studentIds,
      });
      return res.status(400).json({
        status: 'fail',
        message: 'No students found for the specified criteria',
      });
    }

    // Create assignments for all target students
    const assignments = [];
    const errors = [];

    console.log(
      `Starting to create assignments for ${targetStudents.length} students`,
    );

    for (const student of targetStudents) {
      try {
        console.log(`Processing student: ${student.name} (${student._id})`);

        // Check if assignment already exists
        const existingAssignment = await FeeAssignment.findOne({
          student: student._id,
          fee: feeId,
        });

        if (existingAssignment) {
          console.log(`Assignment already exists for student ${student.name}`);
          errors.push({
            studentId: student._id,
            studentName: student.name,
            error: 'Assignment already exists',
          });
          continue;
        }

        // Create new assignment
        const assignment = new FeeAssignment({
          student: student._id,
          fee: feeId,
          assignedAmount,
          dueDate: new Date(dueDate),
          notes: notes || `Bulk assignment for ${fee.name}`,
          assignedBy: req.user.id,
        });

        await assignment.save();
        console.log(
          `Successfully created assignment for student ${student.name}`,
        );
        assignments.push(assignment);
      } catch (error) {
        console.log(
          `Error creating assignment for student ${student.name}:`,
          error.message,
        );
        errors.push({
          studentId: student._id,
          studentName: student.name,
          error: error.message,
        });
      }
    }

    // Log the bulk assignment
    await financialAuditLogger.logBulkAction(
      'CREATE',
      req.user,
      'FEE_ASSIGNMENT',
      {
        feeId,
        assignedAmount,
        dueDate,
        assignTo,
        classIds,
        gradeIds,
        studentIds,
        totalTargeted: targetStudents.length,
        successfullyAssigned: assignments.length,
        errors: errors.length,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      },
    );

    res.status(201).json({
      status: 'success',
      message: `Successfully assigned fees to ${assignments.length} students`,
      data: {
        assignments,
        errors,
        summary: {
          totalTargeted: targetStudents.length,
          successfullyAssigned: assignments.length,
          errors: errors.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Create a new fee assignment
exports.createFeeAssignment = async (req, res, next) => {
  try {
    const { studentId, feeId, assignedAmount, dueDate, notes } = req.body;

    // Verify student and fee exist
    const [student, fee] = await Promise.all([
      Student.findById(studentId),
      Fee.findById(feeId),
    ]);

    if (!student) {
      return res.status(404).json({
        status: 'fail',
        message: 'Student not found',
      });
    }

    if (!fee) {
      return res.status(404).json({
        status: 'fail',
        message: 'Fee not found',
      });
    }

    // Check if assignment already exists
    const existingAssignment = await FeeAssignment.findOne({
      student: studentId,
      fee: feeId,
      status: { $in: ['pending', 'overdue'] },
    });

    if (existingAssignment) {
      return res.status(400).json({
        status: 'fail',
        message: 'Fee assignment already exists for this student',
      });
    }

    const assignmentData = {
      student: studentId,
      fee: feeId,
      assignedAmount: assignedAmount || fee.amount,
      dueDate: dueDate || fee.dueDate,
      assignedBy: req.user.id,
      notes,
      paymentDeadline: fee.dueDate,
    };

    const assignment = await FeeAssignment.create(assignmentData);

    // Log the fee assignment creation
    await financialAuditLogger.logFeeAssignmentAction(
      'CREATE',
      req.user,
      assignment._id,
      {
        studentId: assignment.student,
        feeId: assignment.fee,
        assignedAmount: assignment.assignedAmount,
        dueDate: assignment.dueDate,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      },
    );

    // Populate the response
    await assignment.populate([
      { path: 'student', select: 'name email studentCode' },
      { path: 'fee', select: 'name category amount' },
      { path: 'assignedBy', select: 'profile.firstName profile.lastName' },
    ]);

    res.status(201).json({
      status: 'success',
      data: {
        assignment,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update a fee assignment
exports.updateFeeAssignment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { assignedAmount, dueDate, status, notes } = req.body;

    const assignment = await FeeAssignment.findById(id);
    if (!assignment) {
      return res.status(404).json({
        status: 'fail',
        message: 'Fee assignment not found',
      });
    }

    // If status is being changed to paid, verify payment amount
    if (
      status === 'paid' &&
      assignment.paidAmount < assignment.assignedAmount
    ) {
      return res.status(400).json({
        status: 'fail',
        message: 'Cannot mark as paid - insufficient payment amount',
      });
    }

    const updatedAssignment = await FeeAssignment.findByIdAndUpdate(
      id,
      { assignedAmount, dueDate, status, notes },
      { new: true, runValidators: true },
    );

    res.status(200).json({
      status: 'success',
      data: {
        assignment: updatedAssignment,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Delete a fee assignment
exports.deleteFeeAssignment = async (req, res, next) => {
  try {
    const assignment = await FeeAssignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({
        status: 'fail',
        message: 'Fee assignment not found',
      });
    }

    // Check if payments exist for this assignment
    const Payment = require('../models/paymentModel');
    const payments = await Payment.find({ feeAssignment: assignment._id });

    if (payments.length > 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'Cannot delete assignment with existing payments',
      });
    }

    await FeeAssignment.findByIdAndDelete(req.params.id);

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

// Get fee assignments by student
exports.getFeeAssignmentsByStudent = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { status, academicYear } = req.query;

    // Security check: Ensure students/parents can only access their own data
    if (req.user.role === 'student') {
      // For students, check if they're accessing their own student profile
      if (
        !req.user.studentProfile ||
        req.user.studentProfile.toString() !== studentId
      ) {
        return res.status(403).json({
          status: 'fail',
          message: 'You can only access your own fee assignment data',
        });
      }
    } else if (req.user.role === 'parent') {
      // For parents, check if the student belongs to them
      const Student = require('../models/studentModel');
      const student = await Student.findById(studentId);
      if (
        !student ||
        student.parent.toString() !== req.user.parentProfile.toString()
      ) {
        return res.status(403).json({
          status: 'fail',
          message: "You can only access your child's fee assignment data",
        });
      }
    }

    let filter = { student: studentId };

    if (status) {
      filter.status = status;
    }

    if (academicYear) {
      filter['fee.academicYear'] = academicYear;
    }

    const assignments = await FeeAssignment.find(filter)
      .populate('fee', 'name category amount academicYear')
      .populate('assignedBy', 'profile.firstName profile.lastName')
      .sort({ dueDate: 1 });

    res.status(200).json({
      status: 'success',
      results: assignments.length,
      data: {
        assignments,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get overdue fee assignments
exports.getOverdueAssignments = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const assignments = await FeeAssignment.find({
      status: { $in: ['pending', 'overdue'] },
      dueDate: { $lt: new Date() },
    })
      .populate('student', 'name email studentCode')
      .populate('fee', 'name category')
      .sort({ dueDate: 1 })
      .skip((page - 1) * limit)
      .limit(limit * 1);

    const total = await FeeAssignment.countDocuments({
      status: { $in: ['pending', 'overdue'] },
      dueDate: { $lt: new Date() },
    });

    res.status(200).json({
      status: 'success',
      results: assignments.length,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        total,
      },
      data: {
        assignments,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Generate payment reminders
exports.generatePaymentReminders = async (req, res, next) => {
  try {
    const { reminderType = 'overdue' } = req.body;

    let filter = {};
    let message = '';
    let priority = 'medium';

    if (reminderType === 'overdue') {
      filter = {
        status: 'pending',
        dueDate: { $lt: new Date() },
      };
      message =
        'You have overdue fee payments. Please make payment as soon as possible.';
      priority = 'high';
    } else if (reminderType === 'due_date') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      filter = {
        status: 'pending',
        dueDate: { $gte: new Date(), $lte: tomorrow },
      };
      message =
        'You have fee payments due tomorrow. Please make payment to avoid late fees.';
      priority = 'medium';
    }

    const overdueAssignments = await FeeAssignment.find(filter)
      .populate('student', 'name email')
      .populate('fee', 'name amount');

    const reminders = [];

    for (const assignment of overdueAssignments) {
      // Check if reminder already exists for this assignment and type
      const existingReminder = await PaymentReminder.findOne({
        student: assignment.student._id,
        feeAssignment: assignment._id,
        reminderType,
        isDismissed: false,
      });

      if (!existingReminder) {
        const daysOverdue =
          reminderType === 'overdue'
            ? Math.ceil(
                (new Date() - assignment.dueDate) / (1000 * 60 * 60 * 24),
              )
            : 0;

        const reminder = await PaymentReminder.create({
          student: assignment.student._id,
          feeAssignment: assignment._id,
          reminderType,
          message: `${message} Fee: ${assignment.fee.name} - Amount: $${assignment.remainingAmount}`,
          priority,
          daysOverdue,
        });

        reminders.push(reminder);
      }
    }

    res.status(201).json({
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
