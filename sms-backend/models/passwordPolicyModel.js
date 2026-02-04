const mongoose = require('mongoose');

const passwordPolicySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    rules: {
      minLength: {
        type: Number,
        default: 8,
        min: 6,
      },
      maxLength: {
        type: Number,
        default: 128,
      },
      requireUppercase: {
        type: Boolean,
        default: true,
      },
      requireLowercase: {
        type: Boolean,
        default: true,
      },
      requireNumbers: {
        type: Boolean,
        default: true,
      },
      requireSpecialChars: {
        type: Boolean,
        default: true,
      },
      preventCommonPasswords: {
        type: Boolean,
        default: true,
      },
      preventSequentialChars: {
        type: Boolean,
        default: true,
      },
      preventRepeatedChars: {
        type: Boolean,
        default: true,
      },
      maxRepeatedChars: {
        type: Number,
        default: 3,
      },
      preventPersonalInfo: {
        type: Boolean,
        default: true,
      },
      passwordHistory: {
        type: Number,
        default: 5, // Remember last 5 passwords
        min: 0,
      },
      expiryDays: {
        type: Number,
        default: 90, // Password expires after 90 days
        min: 0,
      },
    },
    applicableRoles: [
      {
        type: String,
        enum: [
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
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  },
);

// Static method to validate password against policy
passwordPolicySchema.statics.validatePassword = function (
  password,
  user = {},
  policy = null,
) {
  const errors = [];

  if (!policy) {
    // Use default policy if none specified
    policy = {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      preventCommonPasswords: true,
      preventSequentialChars: true,
      preventRepeatedChars: true,
      maxRepeatedChars: 3,
      preventPersonalInfo: true,
    };
  }

  // Length validation
  if (password.length < policy.minLength) {
    errors.push(
      `Password must be at least ${policy.minLength} characters long`,
    );
  }

  if (policy.maxLength && password.length > policy.maxLength) {
    errors.push(`Password cannot exceed ${policy.maxLength} characters`);
  }

  // Character requirements
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (policy.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (
    policy.requireSpecialChars &&
    !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  ) {
    errors.push('Password must contain at least one special character');
  }

  // Prevent common passwords
  if (policy.preventCommonPasswords) {
    const commonPasswords = [
      'password',
      '123456',
      '123456789',
      'qwerty',
      'abc123',
      'password123',
      'admin',
      'letmein',
      'welcome',
      'monkey',
      '1234567890',
      'password1',
      'qwerty123',
      'welcome123',
    ];

    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common. Please choose a stronger password');
    }
  }

  // Prevent sequential characters
  if (policy.preventSequentialChars) {
    const sequential =
      /(?:012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i;

    if (sequential.test(password)) {
      errors.push('Password cannot contain sequential characters');
    }
  }

  // Prevent repeated characters
  if (policy.preventRepeatedChars) {
    const repeated = new RegExp(`(.)\\1{${policy.maxRepeatedChars},}`, 'g');

    if (repeated.test(password)) {
      errors.push(
        `Password cannot contain more than ${policy.maxRepeatedChars} repeated characters`,
      );
    }
  }

  // Prevent personal information
  if (policy.preventPersonalInfo && user) {
    const personalInfo = [
      user.username,
      user.email?.split('@')[0],
      user.profile?.firstName,
      user.profile?.lastName,
      user.profile?.phone,
    ]
      .filter(Boolean)
      .map((info) => info.toLowerCase());

    const passwordLower = password.toLowerCase();

    for (const info of personalInfo) {
      if (info && passwordLower.includes(info)) {
        errors.push('Password cannot contain personal information');
        break;
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Static method to get applicable policy for user
passwordPolicySchema.statics.getApplicablePolicy = async function (user) {
  const policies = await this.find({
    isActive: true,
    $or: [
      { applicableRoles: { $in: [user.role] } },
      { applicableRoles: { $size: 0 } }, // Global policies
    ],
  }).sort({ createdAt: -1 });

  // Return the most restrictive policy
  return policies[0] || null;
};

// Static method to check if password is in history
passwordPolicySchema.statics.checkPasswordHistory = async function (
  userId,
  newPassword,
) {
  const User = mongoose.model('User');
  const user = await User.findById(userId).select('+passwordHistory');

  if (!user.passwordHistory || user.passwordHistory.length === 0) {
    return { isValid: true };
  }

  const bcrypt = require('bcryptjs');

  for (const oldPasswordHash of user.passwordHistory) {
    const isMatch = await bcrypt.compare(newPassword, oldPasswordHash);
    if (isMatch) {
      return {
        isValid: false,
        error:
          'Password has been used recently. Please choose a different password',
      };
    }
  }

  return { isValid: true };
};

module.exports = mongoose.model('PasswordPolicy', passwordPolicySchema);
