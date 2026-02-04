const mongoose = require('mongoose');
const Payment = require('../models/paymentModel');
const FeeAssignment = require('../models/feeAssignmentModel');
const Student = require('../models/studentModel');
const Fee = require('../models/feeModel');
const factory = require('./handlerFactory');
const financialAuditLogger = require('../utils/financialAuditLogger');

// Get all payments with filtering and pagination
exports.getAllPayments = factory.getAll(Payment, [
  { path: 'student', select: 'name email studentCode' },
  { path: 'feeAssignment', populate: { path: 'fee', select: 'name category' } },
  { path: 'processedBy', select: 'profile.firstName profile.lastName' },
]);

// Get a single payment
exports.getPayment = factory.getOne(Payment, [
  { path: 'student', select: 'name email studentCode' },
  { path: 'feeAssignment', populate: { path: 'fee', select: 'name category' } },
  { path: 'processedBy', select: 'profile.firstName profile.lastName' },
]);

// Create a new payment
exports.createPayment = async (req, res, next) => {
  try {
    const {
      feeAssignmentId,
      amount,
      paymentMethod,
      referenceNumber,
      notes,
      bankDetails,
    } = req.body;

    // Verify fee assignment exists and get student
    const feeAssignment =
      await FeeAssignment.findById(feeAssignmentId).populate('student');
    if (!feeAssignment) {
      return res.status(404).json({
        status: 'fail',
        message: 'Fee assignment not found',
      });
    }

    // Check if payment amount exceeds remaining amount
    if (amount > feeAssignment.remainingAmount) {
      return res.status(400).json({
        status: 'fail',
        message: 'Payment amount exceeds remaining amount',
      });
    }

    // Create payment
    const paymentData = {
      feeAssignment: feeAssignmentId,
      student: feeAssignment.student._id,
      amount,
      paymentMethod,
      referenceNumber,
      notes,
      bankDetails,
      processedBy: req.user.id,
    };

    const payment = await Payment.create(paymentData);

    // Update fee assignment
    feeAssignment.paidAmount += amount;
    await feeAssignment.save();

    // Log the payment creation
    await financialAuditLogger.logPaymentAction(
      'CREATE',
      req.user,
      payment._id,
      {
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        studentId: payment.student,
        feeAssignmentId: payment.feeAssignment,
        referenceNumber: payment.referenceNumber,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      },
    );

    // Populate the response
    await payment.populate([
      { path: 'student', select: 'name email studentCode' },
      {
        path: 'feeAssignment',
        populate: { path: 'fee', select: 'name category' },
      },
      { path: 'processedBy', select: 'profile.firstName profile.lastName' },
    ]);

    res.status(201).json({
      status: 'success',
      data: {
        payment,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update a payment
exports.updatePayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod, referenceNumber, notes, status } = req.body;

    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({
        status: 'fail',
        message: 'Payment not found',
      });
    }

    // If amount is being changed, update the fee assignment
    if (amount && amount !== payment.amount) {
      const feeAssignment = await FeeAssignment.findById(payment.feeAssignment);
      if (feeAssignment) {
        feeAssignment.paidAmount =
          feeAssignment.paidAmount - payment.amount + amount;
        await feeAssignment.save();
      }
    }

    const updatedPayment = await Payment.findByIdAndUpdate(
      id,
      { amount, paymentMethod, referenceNumber, notes, status },
      { new: true, runValidators: true },
    );

    res.status(200).json({
      status: 'success',
      data: {
        payment: updatedPayment,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Delete a payment
exports.deletePayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({
        status: 'fail',
        message: 'Payment not found',
      });
    }

    // Update fee assignment to remove this payment amount
    const feeAssignment = await FeeAssignment.findById(payment.feeAssignment);
    if (feeAssignment) {
      feeAssignment.paidAmount -= payment.amount;
      await feeAssignment.save();
    }

    await Payment.findByIdAndDelete(req.params.id);

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

// Get payments by student
exports.getPaymentsByStudent = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { page = 1, limit = 10, startDate, endDate } = req.query;

    // Security check: Ensure students/parents can only access their own data
    if (req.user.role === 'student') {
      // For students, check if they're accessing their own student profile
      if (
        !req.user.studentProfile ||
        req.user.studentProfile.toString() !== studentId
      ) {
        return res.status(403).json({
          status: 'fail',
          message: 'You can only access your own payment data',
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
          message: "You can only access your child's payment data",
        });
      }
    }

    let filter = { student: studentId };

    if (startDate || endDate) {
      filter.paymentDate = {};
      if (startDate) filter.paymentDate.$gte = new Date(startDate);
      if (endDate) filter.paymentDate.$lte = new Date(endDate);
    }

    const payments = await Payment.find(filter)
      .populate('feeAssignment', 'fee dueDate assignedAmount')
      .populate('feeAssignment.fee', 'name category')
      .sort({ paymentDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit * 1);

    const total = await Payment.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      results: payments.length,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        total,
      },
      data: {
        payments,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get payment statistics
exports.getPaymentStatistics = async (req, res, next) => {
  try {
    const { startDate, endDate, academicYear } = req.query;

    let filter = { status: 'completed' };

    if (startDate || endDate) {
      filter.paymentDate = {};
      if (startDate) filter.paymentDate.$gte = new Date(startDate);
      if (endDate) filter.paymentDate.$lte = new Date(endDate);
    }

    const totalPayments = await Payment.countDocuments(filter);
    const totalAmount = await Payment.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const paymentsByMethod = await Payment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    const monthlyPayments = await Payment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            year: { $year: '$paymentDate' },
            month: { $month: '$paymentDate' },
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 },
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        statistics: {
          totalPayments,
          totalAmount: totalAmount[0]?.total || 0,
          paymentsByMethod,
          monthlyPayments,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
