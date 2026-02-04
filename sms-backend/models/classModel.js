const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  // Optional academic fields to support semester-based grouping
  semester: {
    type: String,
    default: undefined,
  },
  academicYear: {
    type: Number,
    default: undefined,
  },
  capacity: {
    type: Number,
    required: true,
  },
  supervisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    default: null,
  },
  students: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
    },
  ],
  lessons: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
    },
  ],
  grade: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Grade',
    required: true,
  },
  events: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
    },
  ],
  announcements: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Announcement',
    },
  ],
});

module.exports = mongoose.model('Class', classSchema);
