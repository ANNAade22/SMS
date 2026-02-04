const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  day: {
    type: String,
    enum: [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ],
    required: true,
  },
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
    required: true,
  },
  // Optional validity window for when this lesson schedule applies
  validFrom: {
    type: Date,
    default: Date.now,
  },
  validTo: {
    type: Date,
  },
  // Group ID to bulk-manage related lessons (e.g., Mon–Sun set)
  groupId: {
    type: String,
    index: true,
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true,
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true,
  },
  exams: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
    },
  ],
  assignments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
    },
  ],
});

// Helpful indexes for common queries
lessonSchema.index({ teacher: 1, day: 1 });
lessonSchema.index({ classId: 1, day: 1, startTime: 1 });
lessonSchema.index({ subject: 1, classId: 1 });
lessonSchema.index({ groupId: 1 });

// Validation: validTo after validFrom when both provided
lessonSchema.pre('save', function (next) {
  if (this.validFrom && this.validTo && this.validTo < this.validFrom) {
    return next(new Error('validTo must be after validFrom'));
  }
  next();
});

module.exports = mongoose.model('Lesson', lessonSchema);
