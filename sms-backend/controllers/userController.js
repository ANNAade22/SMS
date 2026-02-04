const User = require('./../models/userModel');
const AuditLog = require('./../models/auditLogModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

// Get user activities (admin only)
exports.getUserActivities = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const { limit = 5 } = req.query;

  // Get recent audit logs for this user as activities
  const activities = await AuditLog.find({
    user: userId,
  })
    .sort({ timestamp: -1 })
    .limit(parseInt(limit))
    .select('action details timestamp success');

  res.status(200).json({
    status: 'success',
    results: activities.length,
    data: {
      activities,
    },
  });
});

exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword.',
        400,
      ),
    );
  }

  // 2) Filtered out unwanted fields names that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'username', 'profile');

  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      data: updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// Admin-only user creation
exports.createUserAdmin = async (req, res, next) => {
  try {
    // Only allow creation by admins (already checked by middleware)
    const { username, password, role, email, department, profile } = req.body;
    const requesterRole = req.user.role;

    // Check if requester can create this specific role
    const canCreateRole = (requesterRole, targetRole) => {
      if (requesterRole === 'super_admin') return true;
      if (requesterRole === 'school_admin') {
        return [
          'academic_admin',
          'exam_admin',
          'finance_admin',
          'student_affairs_admin',
          'it_admin',
        ].includes(targetRole);
      }
      if (requesterRole === 'it_admin') {
        return [
          'academic_admin',
          'exam_admin',
          'finance_admin',
          'student_affairs_admin',
        ].includes(targetRole);
      }
      return false;
    };

    if (!canCreateRole(requesterRole, role)) {
      return res.status(403).json({
        status: 'fail',
        message: `You don't have permission to create ${role} users`,
      });
    }

    if (!username || !password || !role || !email) {
      return res.status(400).json({
        status: 'fail',
        message: 'Missing required fields (username, password, role, email)',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        status: 'fail',
        message: 'Password must be at least 8 characters',
      });
    }

    // Check for duplicate username or email
    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      return res
        .status(409)
        .json({ status: 'fail', message: 'Username or email already exists' });
    }

    // Set default department based on role if not provided
    let userDepartment = department || 'general';
    if (
      role.includes('_admin') &&
      role !== 'school_admin' &&
      role !== 'super_admin'
    ) {
      // Auto-assign department based on role
      const roleToDept = {
        academic_admin: 'academic',
        exam_admin: 'examination',
        finance_admin: 'finance',
        student_affairs_admin: 'student_affairs',
        it_admin: 'it',
      };
      userDepartment = roleToDept[role] || department || 'general';
    }

    // Get default permissions based on role
    const defaultPermissions = new User({ role }).getRolePermissions();

    // Prepare user data
    const userData = {
      username,
      password,
      role,
      email,
      department: userDepartment,
      permissions: defaultPermissions,
    };

    // Add profile data if provided (for admin roles)
    if (profile && (role.includes('_admin') || role === 'teacher')) {
      userData.profile = {
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        phone: profile.phone || '',
      };
    }

    // Create user
    const newUser = await User.create(userData);

    // Log admin creation
    await AuditLog.logEvent({
      user: req.user._id,
      action: 'ADMIN_USER_CREATE',
      resource: 'USER',
      resourceId: newUser._id,
      resourceModel: 'User',
      details: {
        createdUsername: newUser.username,
        createdEmail: newUser.email,
        createdRole: newUser.role,
        createdDepartment: newUser.department,
        createdBy: req.user.username,
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      department: req.user.department,
      role: req.user.role,
      success: true,
    });

    return res.status(201).json({
      status: 'success',
      data: { user: newUser },
      message: `Admin user "${username}" created successfully with ${role} role`,
    });
  } catch (err) {
    console.error('Admin user creation error:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to create user',
      error: err.message,
    });
  }
};

// Delete admin with permission checks
exports.deleteAdmin = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const requesterRole = req.user.role;

  // Only super_admin and school_admin can delete admins
  if (requesterRole !== 'super_admin' && requesterRole !== 'school_admin') {
    return next(
      new AppError('You do not have permission to delete admin users', 403),
    );
  }

  const adminToDelete = await User.findById(id);
  if (!adminToDelete) {
    return next(new AppError('Admin user not found', 404));
  }

  // NEVER allow deletion of super admin users
  if (adminToDelete.role === 'super_admin') {
    return next(
      new AppError(
        'Super admin users cannot be deleted for system security',
        403,
      ),
    );
  }

  // Super admin can delete anyone except other super admins (already protected above)
  if (requesterRole === 'super_admin') {
    // Allow deletion of all non-super-admin users
  }

  // School admin can only delete department admins
  if (requesterRole === 'school_admin') {
    if (['super_admin', 'school_admin'].includes(adminToDelete.role)) {
      return next(
        new AppError(
          'You do not have permission to delete this admin user',
          403,
        ),
      );
    }
  }

  await User.findByIdAndDelete(id);

  // Log admin deletion
  await AuditLog.logEvent({
    user: req.user._id,
    action: 'ADMIN_USER_DELETE',
    resource: 'USER',
    resourceId: id,
    resourceModel: 'User',
    details: {
      deletedUsername: adminToDelete.username,
      deletedRole: adminToDelete.role,
      deletedBy: req.user.username,
    },
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    department: req.user.department,
    role: req.user.role,
    success: true,
  });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.getUser = factory.getOne(User, [
  {
    path: 'teacherProfile',
    select: 'name surname email phone subjects lessons classes',
  },
  {
    path: 'studentProfile',
    select: 'name surname email phone class grade parent',
  },
  { path: 'parentProfile', select: 'name surname email phone students' },
]);
// Include mustChangePassword (select:false by default) for admin listing
exports.getAllUsers = catchAsync(async (req, res, next) => {
  // Build base filter
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.unlinked === 'true') {
    // Include users where corresponding profile not set or null based on role
    if (req.query.role === 'student') {
      filter.$or = [
        { studentProfile: { $exists: false } },
        { studentProfile: null },
      ];
    }
    if (req.query.role === 'teacher') {
      filter.$or = [
        { teacherProfile: { $exists: false } },
        { teacherProfile: null },
      ];
    }
    if (req.query.role === 'parent') {
      filter.$or = [
        { parentProfile: { $exists: false } },
        { parentProfile: null },
      ];
    }
  }

  const query = User.find(filter).select('+mustChangePassword');
  // Remove synthetic params so APIFeatures.filter() does not treat them as real fields
  const cleanedQuery = { ...req.query };
  delete cleanedQuery.unlinked;
  const APIFeatures = require('../utils/apiFeatures');
  const features = new APIFeatures(query, cleanedQuery)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  const users = await features.query.lean();
  const total = await User.countDocuments();
  res.status(200).json({
    status: 'success',
    results: users.length,
    total,
    data: { data: users },
  });
});

// Department-based user management
exports.getUsersByDepartment = catchAsync(async (req, res, next) => {
  const { department } = req.params;

  // Validate department
  const validDepartments = [
    'academic',
    'examination',
    'finance',
    'student_affairs',
    'it',
    'general',
  ];
  if (!validDepartments.includes(department)) {
    return next(new AppError('Invalid department specified', 400));
  }

  const users = await User.find({
    department,
    isActive: true,
  }).select('username email role profile lastLogin');

  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users,
    },
  });
});

// Role-based admin management
exports.getAdminsByRole = catchAsync(async (req, res, next) => {
  const requesterRole = req.user.role;
  const requesterDepartment = req.user.department;

  // Define what roles each requester can see
  const getVisibleRoles = (role) => {
    if (role === 'super_admin') {
      return [
        'super_admin',
        'school_admin',
        'academic_admin',
        'exam_admin',
        'finance_admin',
        'student_affairs_admin',
        'it_admin',
      ];
    }
    if (role === 'school_admin') {
      return [
        'academic_admin',
        'exam_admin',
        'finance_admin',
        'student_affairs_admin',
        'it_admin',
      ];
    }
    if (role === 'it_admin') {
      return [
        'academic_admin',
        'exam_admin',
        'finance_admin',
        'student_affairs_admin',
      ];
    }
    // Department admins can only see their own role
    if (role.includes('_admin')) {
      return [role];
    }
    return [];
  };

  const getVisibleDepartments = (role, department) => {
    if (role === 'super_admin' || role === 'school_admin') {
      return [
        'academic',
        'examination',
        'finance',
        'student_affairs',
        'it',
        'general',
      ];
    }
    if (role === 'it_admin') {
      return ['academic', 'examination', 'finance', 'student_affairs'];
    }
    // Department admins can only see their own department
    if (role.includes('_admin')) {
      return [department];
    }
    return [];
  };

  const visibleRoles = getVisibleRoles(requesterRole);
  const visibleDepartments = getVisibleDepartments(
    requesterRole,
    requesterDepartment,
  );

  // Build query
  const query = {
    role: { $in: visibleRoles },
    department: { $in: visibleDepartments },
    isActive: true,
  };

  const admins = await User.find(query)
    .select('username email role department profile lastLogin permissions')
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: admins.length,
    data: {
      admins,
    },
  });
});

// Permission management
exports.grantPermission = catchAsync(async (req, res, next) => {
  const { userId, permission } = req.body;

  if (!userId || !permission) {
    return next(new AppError('Please provide userId and permission', 400));
  }

  // Validate permission
  const validPermissions = [
    'manage_curriculum',
    'assign_teachers',
    'view_student_progress',
    'manage_subjects',
    'approve_grades',
    'create_exam',
    'edit_exam',
    'delete_exam',
    'view_exam_results',
    'manage_exam_schedule',
    'generate_exam_reports',
    'view_financial_reports',
    'manage_fees',
    'process_payments',
    'generate_financial_reports',
    'manage_student_records',
    'handle_disciplinary',
    'manage_admissions',
    'coordinate_events',
    'manage_system',
    'view_logs',
    'manage_users',
    'configure_settings',
    'view_dashboard',
    'manage_profile',
    'view_reports',
  ];

  if (!validPermissions.includes(permission)) {
    return next(new AppError('Invalid permission specified', 400));
  }

  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Add permission if not already present
  if (!user.permissions.includes(permission)) {
    user.permissions.push(permission);
    await user.save();

    // Log permission grant
    await AuditLog.logEvent({
      user: req.user._id,
      action: 'PERMISSION_GRANT',
      resource: 'USER',
      resourceId: user._id,
      resourceModel: 'User',
      details: {
        targetUser: user.username,
        permission,
        grantedBy: req.user.username,
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      department: req.user.department,
      role: req.user.role,
      success: true,
    });
  }

  res.status(200).json({
    status: 'success',
    message: `Permission '${permission}' granted to user ${user.username}`,
    data: {
      user: {
        id: user._id,
        username: user.username,
        permissions: user.permissions,
      },
    },
  });
});

exports.revokePermission = catchAsync(async (req, res, next) => {
  const { userId, permission } = req.body;

  if (!userId || !permission) {
    return next(new AppError('Please provide userId and permission', 400));
  }

  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Remove permission if present
  const permissionIndex = user.permissions.indexOf(permission);
  if (permissionIndex > -1) {
    user.permissions.splice(permissionIndex, 1);
    await user.save();

    // Log permission revoke
    await AuditLog.logEvent({
      user: req.user._id,
      action: 'PERMISSION_REVOKE',
      resource: 'USER',
      resourceId: user._id,
      resourceModel: 'User',
      details: {
        targetUser: user.username,
        permission,
        revokedBy: req.user.username,
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      department: req.user.department,
      role: req.user.role,
      success: true,
    });
  }

  res.status(200).json({
    status: 'success',
    message: `Permission '${permission}' revoked from user ${user.username}`,
    data: {
      user: {
        id: user._id,
        username: user.username,
        permissions: user.permissions,
      },
    },
  });
});

// Do NOT update passwords with this!
exports.updateUser = factory.updateOne(User);

// Override deleteUser to protect super admin
exports.deleteUser = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // Check if user exists and is super admin
  const userToDelete = await User.findById(id);
  if (!userToDelete) {
    return next(new AppError('User not found', 404));
  }

  // NEVER allow deletion of super admin users
  if (userToDelete.role === 'super_admin') {
    return next(
      new AppError(
        'Super admin users cannot be deleted for system security',
        403,
      ),
    );
  }

  // Use the factory deleteOne for all other users
  await User.findByIdAndDelete(id);

  // Log user deletion
  await AuditLog.logEvent({
    user: req.user._id,
    action: 'USER_DELETE',
    resource: 'USER',
    resourceId: id,
    resourceModel: 'User',
    details: {
      deletedUsername: userToDelete.username,
      deletedRole: userToDelete.role,
      deletedBy: req.user.username,
    },
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    department: req.user.department,
    role: req.user.role,
    success: true,
  });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// Get user activities (recent audit logs)
exports.getUserActivities = catchAsync(async (req, res, next) => {
  const activities = await AuditLog.find({ user: req.user._id })
    .sort({ timestamp: -1 })
    .limit(10)
    .populate('user', 'username')
    .select('action resource details timestamp success');

  res.status(200).json({
    status: 'success',
    data: {
      activities,
    },
  });
});

// Get user stats
exports.getUserStats = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  // Get login count from audit logs
  const loginCount = await AuditLog.countDocuments({
    user: userId,
    action: 'LOGIN',
    success: true,
  });

  // Get last login from audit logs
  const lastLogin = await AuditLog.findOne({
    user: userId,
    action: 'LOGIN',
    success: true,
  })
    .sort({ timestamp: -1 })
    .select('timestamp');

  // Get profile update count
  const profileUpdates = await AuditLog.countDocuments({
    user: userId,
    action: 'PROFILE_UPDATE',
    success: true,
  });

  // Get password change count
  const passwordChanges = await AuditLog.countDocuments({
    user: userId,
    action: 'PASSWORD_CHANGE',
    success: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      stats: {
        totalLogins: loginCount,
        lastLogin: lastLogin ? lastLogin.timestamp : null,
        profileUpdates,
        passwordChanges,
        accountAge: Math.floor(
          (Date.now() - new Date(req.user.createdAt).getTime()) /
            (1000 * 60 * 60 * 24),
        ), // days
      },
    },
  });
});
