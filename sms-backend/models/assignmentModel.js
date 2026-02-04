const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Assignment title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject is required'],
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class is required'],
    },
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'Teacher is required'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    totalPoints: {
      type: Number,
      min: [0, 'Total points cannot be negative'],
      default: 100,
    },
    status: {
      type: String,
      enum: ['Draft', 'Published', 'Completed', 'Overdue'],
      default: 'Draft',
    },
    submissions: [
      {
        student: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Student',
          required: true,
        },
        submittedAt: {
          type: Date,
          default: Date.now,
        },
        fileUrl: String,
        grade: Number,
        feedback: String,
        gradedAt: Date,
        gradedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Teacher',
        },
      },
    ],
    results: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Result',
      },
    ],
  },
  {
    timestamps: true,
  },
);

// Index for better query performance
assignmentSchema.index({ classId: 1, dueDate: -1 });
assignmentSchema.index({ teacher: 1, createdAt: -1 });

// Virtual for submission count
assignmentSchema.virtual('submissionCount').get(function () {
  return this.submissions.length;
});

// Virtual for completion rate
assignmentSchema.virtual('completionRate').get(function () {
  // This would need to be calculated based on class student count
  return 0; // Placeholder
});

// Pre-save middleware to set status based on dates
assignmentSchema.pre('save', function (next) {
  const now = new Date();

  if (this.dueDate < now && this.status === 'Published') {
    this.status = 'Overdue';
  }

  next();
});

module.exports = mongoose.model('Assignment', assignmentSchema);
