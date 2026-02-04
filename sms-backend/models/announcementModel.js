const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Announcement title is required'],
      trim: true,
      maxLength: [100, 'Title must be less than 100 characters'],
    },
    content: {
      type: String,
      required: [true, 'Announcement content is required'],
      maxLength: [1000, 'Content must be less than 1000 characters'],
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium',
    },
    audience: {
      type: String,
      required: [true, 'Audience is required'],
      enum: [
        'All Users',
        'School Staff',
        'Administrative Staff',
        'Teachers',
        'Students',
        'Parents',
        'All Students',
        'All Teachers',
        'All Parents',
      ],
    },
    status: {
      type: String,
      enum: ['Draft', 'Published', 'Scheduled', 'Archived'],
      default: 'Draft',
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    scheduledDate: {
      type: Date,
      default: null,
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      default: null,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Index for better query performance
announcementSchema.index({ audience: 1, status: 1, createdAt: -1 });
announcementSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Announcement', announcementSchema);
