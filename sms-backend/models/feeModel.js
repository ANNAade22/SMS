const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Fee name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: [
        'tuition',
        'transport',
        'meals',
        'books',
        'activities',
        'exam',
        'other',
      ],
      required: [true, 'Fee category is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Fee amount is required'],
      min: [0, 'Fee amount cannot be negative'],
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required'],
    },
    semester: {
      type: String,
      enum: ['first', 'second', 'annual'],
      default: 'annual',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    lateFeeAmount: {
      type: Number,
      default: 0,
      min: [0, 'Late fee cannot be negative'],
    },
    lateFeeDays: {
      type: Number,
      default: 7, // Days after due date when late fee applies
    },
    applicableClasses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class',
      },
    ],
    applicableGrades: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Grade',
      },
    ],
    createdBy: {
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
feeSchema.index({ academicYear: 1, category: 1 });
feeSchema.index({ dueDate: 1 });
feeSchema.index({ isActive: 1 });

module.exports = mongoose.model('Fee', feeSchema);
