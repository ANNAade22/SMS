const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Add this import
const crypto = require('crypto'); // Add this import
// Remove validator import - using custom validation instead

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [50, 'Username cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      validate: {
        validator: function (email) {
          return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email);
        },
        message: 'Please enter a valid email',
      },
    },
    password: {
      type: String,
      required: [true, 'Provide a password'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: [
          'super_admin',
          'school_admin',
          'academic_admin',
          'exam_admin',
          'finance_admin',
          'student_affairs_admin',
          'it_admin',
          'teacher',
          'student',
          'parent',
        ],
        message:
          'Role must be one of: super_admin, school_admin, academic_admin, exam_admin, finance_admin, student_affairs_admin, it_admin, teacher, student, parent',
      },
      required: [true, 'Role is required'],
      default: 'student',
    },
    department: {
      type: String,
      enum: {
        values: [
          'academic',
          'examination',
          'finance',
          'student_affairs',
          'it',
          'general',
        ],
        message:
          'Department must be one of: academic, examination, finance, student_affairs, it, general',
      },
      default: 'general',
    },
    permissions: [
      {
        type: String,
        enum: {
          values: [
            // Special permission for super admin
            '*',
            // Academic permissions
            'manage_curriculum',
            'assign_teachers',
            'view_student_progress',
            'manage_subjects',
            'approve_grades',
            // Exam permissions
            'create_exam',
            'edit_exam',
            'delete_exam',
            'view_exam_results',
            'manage_exam_schedule',
            'generate_exam_reports',
            // Finance permissions
            'view_financial_reports',
            'manage_fees',
            'process_payments',
            'generate_financial_reports',
            // Student affairs permissions
            'manage_student_records',
            'handle_disciplinary',
            'manage_admissions',
            'coordinate_events',
            // IT permissions
            'manage_system',
            'view_logs',
            'manage_users',
            'configure_settings',
            // General permissions
            'view_dashboard',
            'manage_profile',
            'view_reports',
          ],
          message: 'Invalid permission',
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    passwordHistory: [
      {
        type: String,
        select: false, // Don't include in regular queries
      },
    ],
    mustChangePassword: {
      type: Boolean,
      default: false,
      select: false,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
    profile: {
      firstName: String,
      lastName: String,
      phone: String,
      avatar: String,
      dateOfBirth: Date,
      address: String,
    },
    // Legacy field for backward compatibility
    active: {
      type: Boolean,
      default: true,
      select: false,
    },
    // Profile references for linking to Teacher/Student records
    studentProfile: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    teacherProfile: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
    parentProfile: { type: mongoose.Schema.Types.ObjectId, ref: 'Parent' },
    // profile: {
    //   avatar: String,
    //   department: String,
    // },
  },
  { timestamps: true },
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  // Removed 'name' parameter
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});

// Compare password method
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Set passwordChangedAt before saving
userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next(); // Fixed typo: 'isNewD' -> 'isNew'

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// Filter out inactive users
userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

// Check if password was changed after JWT was issued
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );

    return JWTTimestamp < changedTimestamp;
  }

  // False means NOT changed
  return false;
};

// Create password reset token
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  console.log({ resetToken }, this.passwordResetToken);
  return resetToken;
};

// Account lockout methods
userSchema.methods.incLoginAttempts = function () {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  // Lock account after 5 failed attempts for 30 minutes
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = {
      lockUntil: Date.now() + 30 * 60 * 1000, // 30 minutes
    };
  }

  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
    $set: { lastLogin: new Date() },
  });
};

// Virtual for account lock status
userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Permission checking methods
userSchema.methods.hasPermission = function (permission) {
  // Super admin has all permissions
  if (this.role === 'super_admin') return true;

  // Check if user has the specific permission
  return this.permissions && this.permissions.includes(permission);
};

userSchema.methods.hasAnyPermission = function (permissions) {
  // Super admin has all permissions
  if (this.role === 'super_admin') return true;

  // Check if user has any of the specified permissions
  return permissions.some((permission) => this.hasPermission(permission));
};

userSchema.methods.getRolePermissions = function () {
  const rolePermissions = {
    super_admin: ['*'], // All permissions
    school_admin: [
      'manage_curriculum',
      'assign_teachers',
      'view_student_progress',
      'create_exam',
      'edit_exam',
      'view_exam_results',
      'view_financial_reports',
      'manage_fees',
      'manage_student_records',
      'handle_disciplinary',
      'manage_system',
      'view_logs',
      'manage_users',
    ],
    academic_admin: [
      'manage_curriculum',
      'assign_teachers',
      'view_student_progress',
      'manage_subjects',
      'approve_grades',
      'manage_student_records',
    ],
    exam_admin: [
      'create_exam',
      'edit_exam',
      'delete_exam',
      'view_exam_results',
      'manage_exam_schedule',
      'generate_exam_reports',
      'view_dashboard',
      'view_reports',
      'view_student_progress',
      // Note: exam_admin can view students but not manage them
    ],
    finance_admin: [
      'view_financial_reports',
      'manage_fees',
      'process_payments',
      'generate_financial_reports',
    ],
    student_affairs_admin: [
      'manage_student_records',
      'handle_disciplinary',
      'manage_admissions',
      'coordinate_events',
    ],
    it_admin: [
      'manage_system',
      'view_logs',
      'manage_users',
      'configure_settings',
    ],
    teacher: ['view_student_progress', 'manage_subjects', 'approve_grades'],
    student: ['view_dashboard', 'manage_profile'],
    parent: ['view_dashboard', 'manage_profile'],
  };

  return rolePermissions[this.role] || [];
};

// Department access control
userSchema.methods.canAccessDepartment = function (department) {
  // Super admin can access all departments
  if (this.role === 'super_admin') return true;

  // School admin can access all departments
  if (this.role === 'school_admin') return true;

  // Department-specific admins can only access their department
  if (this.role.includes('_admin') && this.role !== 'school_admin') {
    const userDept = this.role.replace('_admin', '');
    return userDept === department;
  }

  return false;
};

module.exports = mongoose.model('User', userSchema);
