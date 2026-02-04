const mongoose = require('mongoose');
const { Schema } = mongoose;

const studentSchema = new Schema({
  username: { type: String, required: true, unique: true },
  name: { type: String, required: [true, 'Please tell us your name'] },
  surname: { type: String },
  email: {
    type: String,
    required: false,
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
    unique: true,
    sparse: true,
  },
  address: {
    type: String,
  },
  img: String,
  bloodType: {
    type: String,
  },
  sex: {
    type: String,
    enum: ['MALE', 'FEMALE'],
    uppercase: true,
    trim: true,
  },
  birthday: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Parent',
    // Made optional to allow creating a student without assigning a parent immediately
    required: false,
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
  },
  grade: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Grade',
    required: true,
  },
  attendances: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Attendance',
    },
  ],
  results: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Result',
    },
  ],
  gpa: {
    type: Number,
    min: 0,
    max: 4.0,
  },
  // Optional school-specific code (e.g., roll number). Unique when present.
  studentCode: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
  },
  transportation: {
    type: String,
    trim: true,
  },
  emergencyContact: {
    name: { type: String, trim: true },
    relationship: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
  },
});

module.exports = mongoose.model('Student', studentSchema);
