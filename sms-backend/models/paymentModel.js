const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    feeAssignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FeeAssignment',
      required: [true, 'Fee assignment is required'],
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0, 'Payment amount cannot be negative'],
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'check', 'card', 'other'],
      required: [true, 'Payment method is required'],
    },
    referenceNumber: {
      type: String,
      trim: true,
    },
    receiptNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['completed', 'pending', 'failed', 'cancelled'],
      default: 'completed',
    },
    notes: {
      type: String,
      trim: true,
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    bankDetails: {
      bankName: String,
      accountNumber: String,
      transactionId: String,
    },
  },
  {
    timestamps: true,
  },
);

// Index for better query performance
paymentSchema.index({ student: 1, paymentDate: -1 });
paymentSchema.index({ feeAssignment: 1 });
paymentSchema.index({ receiptNumber: 1 });
paymentSchema.index({ paymentDate: -1 });

// Virtual to get formatted receipt number
paymentSchema.virtual('formattedReceiptNumber').get(function () {
  if (this.receiptNumber) {
    return `RCP-${this.receiptNumber}`;
  }
  return null;
});

// Pre-save middleware to generate receipt number if not provided
paymentSchema.pre('save', async function (next) {
  if (!this.receiptNumber && this.status === 'completed') {
    let receiptNumber;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      // Get the highest receipt number and increment it
      const lastPayment = await this.constructor.findOne(
        { receiptNumber: { $exists: true } },
        { receiptNumber: 1 },
        { sort: { receiptNumber: -1 } },
      );

      if (lastPayment && lastPayment.receiptNumber) {
        const lastNumber = parseInt(lastPayment.receiptNumber, 10);
        receiptNumber = String(lastNumber + 1).padStart(6, '0');
      } else {
        receiptNumber = '000001';
      }

      // Check if this receipt number already exists
      const existing = await this.constructor.findOne({ receiptNumber });
      if (!existing) {
        isUnique = true;
      } else {
        attempts++;
      }
    }

    if (isUnique) {
      this.receiptNumber = receiptNumber;
    } else {
      // Fallback: use timestamp-based receipt number
      this.receiptNumber = String(Date.now()).slice(-6);
    }
  }
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);
