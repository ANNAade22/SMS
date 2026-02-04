const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema(
  {
    assessmentTitle: {
      type: String,
      required: [true, 'Assessment title is required'],
      trim: true,
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class is required'],
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject is required'],
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student is required'],
    },
    grade: {
      type: String,
      required: [true, 'Grade is required'],
    },
    section: {
      type: String,
      required: [true, 'Section is required'],
    },
    examType: {
      type: String,
      enum: [
        'Quiz',
        'Midterm',
        'Final',
        'Assignment',
        'Project',
        'Lab Exam',
        'Other',
      ],
      default: 'Quiz',
      required: [true, 'Exam type is required'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    score: {
      type: Number,
      required: [true, 'Score is required'],
      min: [0, 'Score cannot be negative'],
    },
    totalMarks: {
      type: Number,
      required: [true, 'Total marks is required'],
      min: [1, 'Total marks must be at least 1'],
    },
    status: {
      type: String,
      enum: ['Graded', 'Pending', 'Incomplete'],
      default: 'Graded',
      required: [true, 'Status is required'],
    },
    remarks: {
      type: String,
      trim: true,
    },
    // Semester system fields
    semester: {
      type: String,
      required: [true, 'Semester is required'],
      enum: ['Semester 1', 'Semester 2'],
      default: 'Semester 1',
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required'],
      // Format: "2024-2025"
    },
    isActive: {
      type: Boolean,
      default: true,
      // When semester ends, set to false
    },
    gradingPeriod: {
      type: String,
      enum: ['Mid-term', 'Final', 'Continuous Assessment'],
      default: 'Continuous Assessment',
    },
    // Keep the old fields for backward compatibility
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      default: null,
    },
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Helpful indexes
resultSchema.index({ student: 1, createdAt: -1 });
resultSchema.index({ class: 1, subject: 1, createdAt: -1 });
resultSchema.index({ examType: 1, date: -1 });
resultSchema.index({ semester: 1, academicYear: 1, isActive: 1 });
resultSchema.index({ student: 1, semester: 1, academicYear: 1 });
resultSchema.index({ class: 1, semester: 1, academicYear: 1 });

module.exports = mongoose.model('Result', resultSchema);
