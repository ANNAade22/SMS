const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('./../models/userModel');
const Session = require('./../models/sessionModel');
const AuditLog = require('./../models/auditLogModel');
const SecurityEvent = require('./../models/securityEventModel');
const PasswordPolicy = require('./../models/passwordPolicyModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const sendEmail = require('./../utils/email');

const signAccessToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '15m' });
const signFirstLoginToken = (id) =>
  jwt.sign({ id, scope: 'first_password' }, process.env.JWT_SECRET, {
    expiresIn: '15m',
  });
const generateRefreshToken = () => crypto.randomBytes(40).toString('hex');

const issueTokens = async (user, req, res, statusCode = 200, session) => {
  const accessToken = signAccessToken(user._id);
  const refreshToken = generateRefreshToken();

  // Set refresh token cookie (httpOnly)
  // Use broader path '/api' so session-related cookies are sent to all API endpoints (not just /api/v1/users)
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    path: '/api',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  // Ensure session exists
  let activeSession = session;
  if (!activeSession && req) {
    activeSession = await Session.createSession(user, accessToken, req);
  }
  if (activeSession) {
    await Session.setRefreshToken(activeSession.sessionId, refreshToken);
    res.cookie('sid', activeSession.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      path: '/api',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  user.password = undefined;

  // Issue / rotate CSRF token (non-HttpOnly) so frontend can read & echo in header
  if (res.issueCsrfToken) {
    res.issueCsrfToken();
  }
  res.status(statusCode).json({
    status: 'success',
    token: accessToken,
    data: { user },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const {
    username,
    email,
    password,
    role,
    department,
    firstName,
    lastName,
    phone,
  } = req.body;

  // Validate required fields
  if (!username || !email || !password || !role) {
    return next(
      new AppError('Please provide username, email, password, and role', 400),
    );
  }

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existingUser) {
    return next(
      new AppError('User with this username or email already exists', 400),
    );
  }

  // Validate password against policy
  const passwordValidation = PasswordPolicy.validatePassword(password, {
    username,
    email,
    profile: { firstName, lastName },
  });

  if (!passwordValidation.isValid) {
    // Log weak password attempt
    await SecurityEvent.logSecurityEvent({
      type: 'WEAK_PASSWORD_DETECTED',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      details: {
        username,
        email,
        errors: passwordValidation.errors,
      },
      riskScore: 30,
    });

    return next(
      new AppError(
        `Password does not meet security requirements: ${passwordValidation.errors.join(', ')}`,
        400,
      ),
    );
  }

  // Set default department based on role
  let userDepartment = department || 'general';
  if (
    role.includes('_admin') &&
    role !== 'school_admin' &&
    role !== 'super_admin'
  ) {
    userDepartment = role.replace('_admin', '');
  }

  // Get default permissions based on role
  const defaultPermissions = new User({ role }).getRolePermissions();

  // Create new user
  const newUser = await User.create({
    username,
    email,
    password,
    role,
    department: userDepartment,
    permissions: defaultPermissions,
    profile: {
      firstName,
      lastName,
      phone,
    },
  });

  // Send welcome email (optional)
  // await sendEmail({
  //   email: newUser.email,
  //   subject: 'Welcome to School Management System',
  //   message: `Welcome ${newUser.profile.firstName || newUser.username}! Your account has been created successfully.`
  // });

  await issueTokens(newUser, req, res, 201);

  // Log user creation
  await AuditLog.logEvent({
    user: newUser._id,
    action: 'USER_CREATE',
    resource: 'USER',
    resourceId: newUser._id,
    resourceModel: 'User',
    details: {
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      department: newUser.department,
      createdBy: req.user ? req.user._id : null,
    },
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    department: newUser.department,
    role: newUser.role,
    success: true,
  });
});

exports.login = catchAsync(async (req, res, next) => {
  const { username, password } = req.body;

  // 1) Check if username and password exist
  if (!username || !password) {
    return next(new AppError('Please provide username and password', 400));
  }

  // 2) Check if user exists and get password for comparison
  const user = await User.findOne({ username }).select(
    '+password +loginAttempts +lockUntil +mustChangePassword',
  );

  // 3) Check if account is locked
  if (user && user.isLocked) {
    // Log failed login attempt due to lock
    try {
      await AuditLog.logEvent({
        user: user._id,
        action: 'FAILED_LOGIN',
        resource: 'USER',
        details: { reason: 'account_locked', username },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        department: user.department,
        role: user.role,
        success: false,
        errorMessage: 'Account is locked',
      });
    } catch (auditError) {
      console.error(
        'Audit logging failed for locked account:',
        auditError.message,
      );
    }

    return next(
      new AppError(
        'Account is temporarily locked due to too many failed login attempts. Please try again later.',
        423,
      ),
    );
  }

  // 4) Check if user exists and password is correct
  if (!user || !(await user.correctPassword(password, user.password))) {
    // Increment login attempts if user exists
    if (user) {
      try {
        await user.incLoginAttempts();
      } catch (error) {
        // Log the error but don't fail the login attempt
        console.error('Failed to increment login attempts:', error.message);
      }
    }

    return next(new AppError('Incorrect username or password', 401));
  }

  // 5) Check if user is active
  if (!user.isActive) {
    return next(
      new AppError(
        'Your account has been deactivated. Please contact administrator.',
        403,
      ),
    );
  }

  // 6) Reset login attempts on successful login and refetch user
  try {
    await user.resetLoginAttempts();
  } catch (error) {
    // Log the error but continue with login
    console.error('Failed to reset login attempts:', error.message);
  }

  // Refetch user to get updated data including mustChangePassword
  const updatedUser = await User.findById(user._id).select(
    '+mustChangePassword',
  );

  // 7) Enforce session limits
  await Session.enforceSessionLimit(updatedUser._id, 5); // Max 5 concurrent sessions

  // 8) If must change password, send restricted first-login token instead of full session
  if (updatedUser.mustChangePassword) {
    const firstLoginToken = signFirstLoginToken(updatedUser._id);
    // Do NOT create refresh/session yet
    if (res.issueCsrfToken) {
      res.issueCsrfToken();
    }
    return res.status(200).json({
      status: 'password_change_required',
      firstLoginToken,
      data: {
        user: {
          id: updatedUser._id,
          username: updatedUser.username,
          role: updatedUser.role,
        },
      },
    });
  }

  // Normal login flow
  await issueTokens(updatedUser, req, res, 200);

  // 9) Log successful login
  try {
    await AuditLog.logEvent({
      user: updatedUser._id,
      action: 'LOGIN',
      resource: 'USER',
      details: {
        username,
        department: updatedUser.department,
        role: updatedUser.role,
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      department: updatedUser.department,
      role: updatedUser.role,
      success: true,
    });
  } catch (auditError) {
    console.error('Audit logging failed for login:', auditError.message);
    // Continue with login even if audit logging fails
  }
});

// First password setup using restricted first-login token
exports.firstPasswordSetup = catchAsync(async (req, res, next) => {
  // Expect Authorization: Bearer <firstLoginToken>
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return next(new AppError('Missing first login token', 401));
  }
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (e) {
    return next(new AppError('Invalid or expired token', 401));
  }
  if (decoded.scope !== 'first_password') {
    return next(new AppError('Invalid token scope', 401));
  }
  const { id } = decoded;
  const { newPassword } = req.body;
  if (!newPassword) {
    return next(new AppError('Provide newPassword', 400));
  }
  const user = await User.findById(id).select(
    '+password +mustChangePassword +passwordHistory',
  );
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  if (!user.mustChangePassword) {
    return next(new AppError('Password already set', 400));
  }

  // Validate password policy
  const passwordValidation = PasswordPolicy.validatePassword(newPassword, {
    username: user.username,
    email: user.email,
    profile: {
      firstName: user.profile?.firstName,
      lastName: user.profile?.lastName,
    },
    passwordHistory: user.passwordHistory || [],
  });
  if (!passwordValidation.isValid) {
    return next(
      new AppError(
        `Weak password: ${passwordValidation.errors.join(', ')}`,
        400,
      ),
    );
  }

  // Append previous hash to history (limit to last 5)
  if (user.password) {
    user.passwordHistory = user.passwordHistory || [];
    user.passwordHistory.unshift(user.password);
    user.passwordHistory = user.passwordHistory.slice(0, 5);
  }
  user.password = newPassword;
  user.mustChangePassword = false;
  await user.save();

  // Issue full tokens now
  await issueTokens(user, req, res, 200);
});

// Admin: regenerate first login token for a user who still must change password
exports.regenerateFirstLoginToken = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const user = await User.findById(id).select('+mustChangePassword');
  if (!user) return next(new AppError('User not found', 404));
  if (user.role !== 'student')
    return next(new AppError('Only student accounts supported', 400));
  if (!user.mustChangePassword)
    return next(new AppError('User already set password', 400));
  const firstLoginToken = signFirstLoginToken(user._id);
  // Audit log (best-effort)
  try {
    await AuditLog.logEvent({
      user: req.user?._id,
      action: 'REGENERATE_FIRST_LOGIN_TOKEN',
      resource: 'USER',
      resourceId: user._id,
      resourceModel: 'User',
      details: { regeneratedFor: user.username },
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('User-Agent'),
      department: req.user?.department,
      role: req.user?.role,
      success: true,
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Audit log failure (regenerate token):', e.message);
  }
  return res.status(200).json({ status: 'success', firstLoginToken });
});

exports.logout = catchAsync(async (req, res, next) => {
  // Get token from request
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (token) {
    // Invalidate the session
    const session = await Session.findOneAndUpdate(
      { token, isActive: true },
      {
        isActive: false,
        logoutTime: new Date(),
      },
    );

    if (session) {
      // Log logout event
      try {
        await AuditLog.logEvent({
          user: req.user._id,
          action: 'LOGOUT',
          resource: 'SESSION',
          resourceId: session._id,
          resourceModel: 'Session',
          details: { sessionId: session.sessionId },
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          department: req.user.department,
          role: req.user.role,
          success: true,
        });
      } catch (auditError) {
        console.error('Audit logging failed for logout:', auditError.message);
      }
    }
  }

  // Clear cookies (legacy + refresh + sid)
  const base = {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    path: '/api/v1/users',
  };
  res.cookie('jwt', 'loggedout', base);
  res.cookie('refreshToken', '', base);
  res.cookie('sid', '', base);

  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully',
  });
});

// Logout all active sessions for current user
exports.logoutAll = catchAsync(async (req, res, next) => {
  try {
    const result = await Session.invalidateUserSessions(req.user._id);
    const base = {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      path: '/api/v1/users',
    };
    res.cookie('jwt', 'loggedout', base);
    res.cookie('refreshToken', '', base);
    res.cookie('sid', '', base);

    try {
      await AuditLog.logEvent({
        user: req.user._id,
        action: 'LOGOUT_ALL',
        resource: 'SESSION',
        details: { sessionsInvalidated: result.modifiedCount },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        department: req.user.department,
        role: req.user.role,
        success: true,
      });
    } catch (e) {
      console.error('Audit logging failed for logoutAll:', e.message);
    }

    res.status(200).json({
      status: 'success',
      message: `All sessions (${result.modifiedCount}) invalidated`,
    });
  } catch (err) {
    return next(new AppError('Failed to logout all sessions', 500));
  }
});

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check if its there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  // console.log(token);

  if (!token) {
    // Provide explicit 401 so error handler doesn't default to 500
    return next(
      new AppError('You are not logged in! Please log in to get access', 401),
    );
  }

  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  // console.log(decoded);
  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    return next(
      new AppError(
        'The user belonging to this token does no longer exist',
        401,
      ),
    );
  }

  // 4) check if user change password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again.', 401),
    );
  }
  //GRANT ACCESS RO PROTECTED ROUTE
  req.user = currentUser;
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403),
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email

  const user = await User.findOne({ username: req.body.username });
  if (!user) {
    return next(new AppError('There is no user with that email address', 404));
  }

  // 2) Generate the randome reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  // 3) send it to user's email
  const resetURL = `${req.protocol}://${req.get(
    'host',
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, Please ignore this email!`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (valid for 10 min)',
      message,
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to mail',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('There was an error sending the email. Try again later!'),
      500,
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  // user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // Log password reset
  await AuditLog.logEvent({
    user: user._id,
    action: 'PASSWORD_RESET_SUCCESS',
    resource: 'USER',
    resourceId: user._id,
    resourceModel: 'User',
    details: { method: 'token_reset' },
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    department: user.department,
    role: user.role,
    success: true,
  });

  await issueTokens(user, req, res, 200);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user.id).select(
    '+password +passwordHistory',
  );

  if (!user) {
    return next(new AppError('User not found.', 404));
  }

  // 2) Check if POSTed current password is correct
  const correct = await user.correctPassword(
    req.body.currentPassword,
    user.password,
  );
  if (!correct) {
    return next(new AppError('Your current password is incorrect.', 401));
  }

  // 3) Validate new password against policy
  const passwordValidation = PasswordPolicy.validatePassword(
    req.body.password,
    user,
  );

  if (!passwordValidation.isValid) {
    return next(
      new AppError(
        `New password does not meet security requirements: ${passwordValidation.errors.join(', ')}`,
        400,
      ),
    );
  }

  // 4) Check password history
  const historyCheck = await PasswordPolicy.checkPasswordHistory(
    user._id,
    req.body.password,
  );

  if (!historyCheck.isValid) {
    return next(new AppError(historyCheck.error, 400));
  }

  // 5) Update password history
  if (!user.passwordHistory) user.passwordHistory = [];
  user.passwordHistory.unshift(user.password); // Add current password to history
  user.passwordHistory = user.passwordHistory.slice(0, 5); // Keep only last 5 passwords

  // 6) Update password
  user.password = req.body.password;
  user.passwordChangedAt = new Date();
  await user.save();

  // 7) Log user in, send JWT (re-issue tokens)
  await issueTokens(user, req, res, 200);

  // 8) Log password change
  await AuditLog.logEvent({
    user: user._id,
    action: 'PASSWORD_CHANGE',
    resource: 'USER',
    resourceId: user._id,
    resourceModel: 'User',
    details: { method: 'authenticated_change' },
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    department: user.department,
    role: user.role,
    success: true,
  });
});

// Department-based access control middleware
exports.checkDepartment = (department) => {
  return (req, res, next) => {
    if (!req.user.canAccessDepartment(department)) {
      return next(
        new AppError(
          `Access denied. You don't have permission to access ${department} department.`,
          403,
        ),
      );
    }
    next();
  };
};

// Permission-based access control middleware
exports.checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user.hasPermission(permission)) {
      return next(
        new AppError(
          `Access denied. You don't have the required permission: ${permission}`,
          403,
        ),
      );
    }
    next();
  };
};

// Check any of the specified permissions
exports.checkAnyPermission = (permissions) => {
  return (req, res, next) => {
    if (!req.user.hasAnyPermission(permissions)) {
      return next(
        new AppError(
          `Access denied. You don't have any of the required permissions: ${permissions.join(', ')}`,
          403,
        ),
      );
    }
    next();
  };
};

// Enhanced restrictTo with department support
exports.restrictToEnhanced = (...roles) => {
  return (req, res, next) => {
    // Allow super admin all access
    if (req.user.role === 'super_admin') {
      return next();
    }

    // Check if user has required role
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403),
      );
    }

    next();
  };
};

// Account status check middleware
exports.checkAccountStatus = (req, res, next) => {
  if (!req.user.isActive) {
    return next(
      new AppError(
        'Your account has been deactivated. Please contact administrator.',
        403,
      ),
    );
  }

  if (req.user.isLocked) {
    return next(
      new AppError(
        'Your account is temporarily locked. Please try again later.',
        423,
      ),
    );
  }

  next();
};

// Login attempt logging middleware
exports.logLoginAttempt = (req, res, next) => {
  // This could be enhanced to log to a separate collection
  console.log(
    `Login attempt for user: ${req.body.username || 'unknown'} at ${new Date().toISOString()}`,
  );
  next();
};

// Exchange refresh token + sid for new access token
exports.refresh = catchAsync(async (req, res, next) => {
  const { refreshToken, sid } = req.cookies || {};
  if (!refreshToken || !sid) {
    return next(new AppError('Refresh credentials missing', 401));
  }
  const session = await Session.verifyRefreshToken(sid, refreshToken);
  if (!session) return next(new AppError('Invalid or expired session', 401));
  const user = await User.findById(session.user);
  if (!user) return next(new AppError('User no longer exists', 401));
  // Log security event for refresh
  try {
    await SecurityEvent.logSecurityEvent({
      type: 'TOKEN_REFRESH',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      user: user._id,
      sessionId: session.sessionId,
      riskScore: 5,
      details: { route: 'refresh' },
    });
  } catch (e) {
    console.error('SecurityEvent logging failed (refresh):', e.message);
  }
  await issueTokens(user, req, res, 200, session);
});
