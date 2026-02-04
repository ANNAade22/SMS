// models/Parent.js
const mongoose = require('mongoose');

const parentSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Please tell us your name'] },
  surname: { type: String, required: [true, 'Please tell us your surname'] },
  username: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    unique: true,
    validate: {
      validator: function (val) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      },
      message: 'Please provide a valid email address',
    },
  },
  phone: {
    type: String,
    required: true,
    unique: true,
  },
  address: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Virtual populate: derive students referencing this parent
parentSchema.virtual('students', {
  ref: 'Student',
  foreignField: 'parent',
  localField: '_id',
});

// Ensure virtuals appear in JSON/object outputs where used
parentSchema.set('toObject', { virtuals: true });
parentSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Parent', parentSchema);
