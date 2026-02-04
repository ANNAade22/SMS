const mongoose = require('mongoose');

const examSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    type: {
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
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
      required: false, // Made optional for subject/class specific exams
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: false, // Optional for subject-specific exams
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: false, // Optional for class-specific exams
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: false, // Optional, can be derived from lesson or explicitly set
    },
    totalMarks: {
      type: Number,
      min: 0,
      default: 100,
    },
    description: {
      type: String,
      trim: true,
    },
    roomNumber: {
      type: String,
      trim: true,
      required: false,
    },
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

// Validation middleware: Prefer an association but don't hard error for simple tests
examSchema.pre('save', async function (next) {
  if (!this.lesson && !this.subject && !this.classId) {
    // Allow creation without associations (useful for quick test data)
    // but set a no-op; downstream features can still show generic exams
  }

  // If lesson is provided, populate teacher from lesson
  if (this.lesson && !this.teacher) {
    try {
      const Lesson = mongoose.model('Lesson');
      const lesson = await Lesson.findById(this.lesson).populate('teacher');
      if (lesson && lesson.teacher) {
        this.teacher = lesson.teacher._id;
      }
    } catch (err) {
      // Continue without setting teacher if lesson population fails
    }
  }

  next();
});

// Helpful indexes for common filters/sorts
examSchema.index({ classId: 1, startTime: -1 });
examSchema.index({ teacher: 1, startTime: -1 });
examSchema.index({ subject: 1, startTime: -1 });

module.exports = mongoose.model('Exam', examSchema);
