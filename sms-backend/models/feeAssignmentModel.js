const mongoose = require('mongoose');

const feeAssignmentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student is required'],
    },
    fee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Fee',
      required: [true, 'Fee is required'],
    },
    assignedAmount: {
      type: Number,
      required: [true, 'Assigned amount is required'],
      min: [0, 'Assigned amount cannot be negative'],
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'overdue', 'cancelled'],
      default: 'pending',
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: [0, 'Paid amount cannot be negative'],
    },
    remainingAmount: {
      type: Number,
      default: function () {
        return this.assignedAmount - this.paidAmount;
      },
    },
    lateFeeApplied: {
      type: Boolean,
      default: false,
    },
    lateFeeAmount: {
      type: Number,
      default: 0,
      min: [0, 'Late fee cannot be negative'],
    },
    paymentDeadline: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Index for better query performance
feeAssignmentSchema.index({ student: 1, status: 1 });
feeAssignmentSchema.index({ dueDate: 1, status: 1 });
feeAssignmentSchema.index({ fee: 1 });

// Virtual to calculate total amount including late fees
feeAssignmentSchema.virtual('totalAmount').get(function () {
  return this.assignedAmount + this.lateFeeAmount;
});

// Virtual to check if overdue
feeAssignmentSchema.virtual('isOverdue').get(function () {
  return this.status === 'pending' && new Date() > this.dueDate;
});

// Middleware to update remaining amount and status
feeAssignmentSchema.pre('save', function (next) {
  this.remainingAmount = this.assignedAmount - this.paidAmount;

  // Update status based on payment
  if (this.paidAmount >= this.assignedAmount) {
    this.status = 'paid';
  } else if (this.status === 'pending' && new Date() > this.dueDate) {
    this.status = 'overdue';
  }

  next();
});

module.exports = mongoose.model('FeeAssignment', feeAssignmentSchema);
