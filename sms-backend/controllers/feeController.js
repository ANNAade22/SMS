const mongoose = require('mongoose');
const Fee = require('../models/feeModel');
const FeeAssignment = require('../models/feeAssignmentModel');
const Student = require('../models/studentModel');
const Class = require('../models/classModel');
const Grade = require('../models/gradeModel');
const factory = require('./handlerFactory');
const financialAuditLogger = require('../utils/financialAuditLogger');

// Get all fees with filtering and pagination
exports.getAllFees = factory.getAll(Fee);

// Get a single fee
exports.getFee = factory.getOne(Fee);

// Create a new fee
exports.createFee = async (req, res, next) => {
  try {
    // Add createdBy from authenticated user
    req.body.createdBy = req.user.id;

    const fee = await Fee.create(req.body);

    // Log the fee creation
    await financialAuditLogger.logFeeAction('CREATE', req.user, fee._id, {
      feeName: fee.name,
      category: fee.category,
      amount: fee.amount,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.status(201).json({
      status: 'success',
      data: {
        fee,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update a fee
exports.updateFee = async (req, res, next) => {
  try {
    const fee = await Fee.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!fee) {
      return res.status(404).json({
        status: 'fail',
        message: 'No fee found with that ID',
      });
    }

    // Log the fee update
    await financialAuditLogger.logFeeAction('UPDATE', req.user, fee._id, {
      feeName: fee.name,
      category: fee.category,
      amount: fee.amount,
      changes: req.body,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.status(200).json({
      status: 'success',
      data: {
        fee,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Delete a fee (soft delete by setting isActive to false)
exports.deleteFee = async (req, res, next) => {
  try {
    const fee = await Fee.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true },
    );

    if (!fee) {
      return res.status(404).json({
        status: 'fail',
        message: 'No fee found with that ID',
      });
    }

    // Log the fee deletion
    await financialAuditLogger.logFeeAction('DELETE', req.user, fee._id, {
      feeName: fee.name,
      category: fee.category,
      amount: fee.amount,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.status(200).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

// Get fees by category
exports.getFeesByCategory = async (req, res, next) => {
  try {
    const { category } = req.params;
    const { academicYear } = req.query;

    let filter = { category, isActive: true };
    if (academicYear) {
      filter.academicYear = academicYear;
    }

    const fees = await Fee.find(filter).sort({ dueDate: 1 });

    res.status(200).json({
      status: 'success',
      results: fees.length,
      data: {
        fees,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Assign fees to students
exports.assignFeesToStudents = async (req, res, next) => {
  try {
    const { feeId, studentIds, customAmount, customDueDate } = req.body;

    const fee = await Fee.findById(feeId);
    if (!fee) {
      return res.status(404).json({
        status: 'fail',
        message: 'Fee not found',
      });
    }

    const assignments = [];

    for (const studentId of studentIds) {
      const student = await Student.findById(studentId);
      if (!student) continue;

      const assignmentData = {
        student: studentId,
        fee: feeId,
        assignedAmount: customAmount || fee.amount,
        dueDate: customDueDate || fee.dueDate,
        assignedBy: req.user.id,
        paymentDeadline: fee.dueDate,
      };

      const assignment = await FeeAssignment.create(assignmentData);
      assignments.push(assignment);
    }

    res.status(201).json({
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

// Get fee statistics
exports.getFeeStatistics = async (req, res, next) => {
  try {
    const { academicYear } = req.query;

    let filter = { isActive: true };
    if (academicYear) {
      filter.academicYear = academicYear;
    }

    const totalFees = await Fee.countDocuments(filter);

    const feesByCategory = await Fee.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    const upcomingDueDates = await Fee.find({
      ...filter,
      dueDate: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })
      .sort({ dueDate: 1 })
      .limit(10);

    res.status(200).json({
      status: 'success',
      data: {
        statistics: {
          totalFees,
          feesByCategory,
          upcomingDueDates,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
