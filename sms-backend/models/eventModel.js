const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
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
    location: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'Professional Development',
        'Curriculum',
        'Orientation',
        'Meeting',
        'Training',
        'Other',
      ],
      default: 'Professional Development',
    },
    audience: {
      type: String,
      required: true,
      default: 'All Teachers',
    },
    status: {
      type: String,
      required: true,
      enum: ['Planning', 'Upcoming', 'Ongoing', 'Completed', 'Cancelled'],
      default: 'Planning',
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      default: null,
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

module.exports = mongoose.model('Event', eventSchema);
