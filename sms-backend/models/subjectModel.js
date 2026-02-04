const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  teachers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
    },
  ],
  lessons: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
    },
  ],
  grade: {
    type: String,
    required: true,
  },
  credits: {
    type: Number,
    default: 0,
  },
  enrolled: {
    type: Number,
    default: 0,
  },
  capacity: {
    type: Number,
    default: () => Number(process.env.SUBJECT_DEFAULT_CAPACITY || 35),
    min: [1, 'Capacity must be at least 1'],
  },
  room: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'On Hold'],
    default: 'Active',
  },
});

// Server-side validation: enrolled cannot exceed capacity
subjectSchema.pre('validate', function (next) {
  if (typeof this.enrolled === 'number' && typeof this.capacity === 'number') {
    if (this.enrolled > this.capacity) {
      return next(
        new mongoose.Error.ValidationError(
          Object.assign(new Error('Validation failed'), {
            errors: {
              enrolled: {
                name: 'ValidatorError',
                message: 'Enrolled cannot exceed capacity',
                path: 'enrolled',
                value: this.enrolled,
              },
            },
          }),
        ),
      );
    }
    if (this.enrolled < 0) {
      return next(
        new mongoose.Error.ValidationError(
          Object.assign(new Error('Validation failed'), {
            errors: {
              enrolled: {
                name: 'ValidatorError',
                message: 'Enrolled cannot be negative',
                path: 'enrolled',
                value: this.enrolled,
              },
            },
          }),
        ),
      );
    }
  }
  next();
});

module.exports = mongoose.model('Subject', subjectSchema);
