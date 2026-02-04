const mongoose = require('mongoose');

const paymentReminderSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student is required'],
    },
    feeAssignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FeeAssignment',
      required: [true, 'Fee assignment is required'],
    },
    reminderType: {
      type: String,
      enum: ['due_date', 'overdue', 'login_reminder'],
      required: [true, 'Reminder type is required'],
    },
    message: {
      type: String,
      required: [true, 'Reminder message is required'],
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    isDismissed: {
      type: Boolean,
      default: false,
    },
    sentDate: {
      type: Date,
      default: Date.now,
    },
    readDate: {
      type: Date,
    },
    dismissedDate: {
      type: Date,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    daysOverdue: {
      type: Number,
      default: 0,
      min: [0, 'Days overdue cannot be negative'],
    },
  },
  {
    timestamps: true,
  },
);

// Index for better query performance
paymentReminderSchema.index({ student: 1, isRead: 1, isDismissed: 1 });
paymentReminderSchema.index({ reminderType: 1 });
paymentReminderSchema.index({ sentDate: -1 });

// Virtual to check if reminder is active (not dismissed)
paymentReminderSchema.virtual('isActive').get(function () {
  return !this.isDismissed;
});

// Middleware to set read date when marked as read
paymentReminderSchema.pre('save', function (next) {
  if (this.isModified('isRead') && this.isRead && !this.readDate) {
    this.readDate = new Date();
  }

  if (
    this.isModified('isDismissed') &&
    this.isDismissed &&
    !this.dismissedDate
  ) {
    this.dismissedDate = new Date();
  }

  next();
});

module.exports = mongoose.model('PaymentReminder', paymentReminderSchema);
