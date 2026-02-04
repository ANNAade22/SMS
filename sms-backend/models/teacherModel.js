const mongoose = require('mongoose');
// const { Schema } = mongoose;

const teacherSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Please tell us your name'] },
  surname: { type: String, required: [true, 'Please tell us your surname'] },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
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
    unique: true,
    sparse: true,
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
  },
  img: {
    type: String,
    required: false, // Making image optional
  },
  bloodType: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: [true, 'Blood type is required'],
  },
  sex: {
    type: String,
    enum: ['MALE', 'FEMALE'],
    required: [true, 'Gender is required'],
  },
  birthday: {
    type: Date,
    required: [true, 'Date of birth is required'],
    validate: {
      validator: function (value) {
        return value && value <= new Date();
      },
      message: 'Birthday cannot be in the future',
    },
  },
  // Basic employment info
  salary: {
    type: Number,
    min: [0, 'Salary cannot be negative'],
    required: false,
  },
  hireDate: {
    type: Date,
    required: false,
  },
  qualification: {
    type: String,
    trim: true,
    required: false,
  },
  experience: {
    type: Number,
    min: [0, 'Experience cannot be negative'],
    required: false,
    default: 0,
  },
  subjects: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
    },
  ],
  lessons: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
    },
  ],
  classes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
    },
  ],
});

module.exports = mongoose.model('Teacher', teacherSchema);
