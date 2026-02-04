const mongoose = require('mongoose');

const semesterSchema = new mongoose.Schema(
  {
    semester: {
      type: String,
      required: [true, 'Semester is required'],
      enum: ['Semester 1', 'Semester 2'],
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required'],
      // Format: "2024-2025"
    },
    isActive: {
      type: Boolean,
      default: false,
      // Only one semester can be active at a time
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    status: {
      type: String,
      enum: ['Planning', 'Active', 'Completed', 'Archived'],
      default: 'Planning',
    },
    description: {
      type: String,
      trim: true,
    },
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

// Ensure only one active semester at a time
semesterSchema.pre('save', async function (next) {
  if (this.isActive) {
    // Deactivate all other semesters
    await this.constructor.updateMany(
      { _id: { $ne: this._id } },
      { isActive: false },
    );
  }
  next();
});

// Indexes
semesterSchema.index({ academicYear: 1, semester: 1 }, { unique: true });
semesterSchema.index({ isActive: 1 });
semesterSchema.index({ status: 1 });

module.exports = mongoose.model('Semester', semesterSchema);
