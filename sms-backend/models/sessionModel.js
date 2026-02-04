const mongoose = require('mongoose');
const crypto = require('crypto');

const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sessionId: {
      type: String,
      required: true,
      unique: true,
    },
    token: {
      type: String,
      required: true,
    },
    ipAddress: String,
    userAgent: String,
    deviceInfo: {
      type: String,
      default: 'Unknown',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    loginTime: {
      type: Date,
      default: Date.now,
    },
    logoutTime: Date,
    department: {
      type: String,
      enum: [
        'academic',
        'examination',
        'finance',
        'student_affairs',
        'it',
        'general',
      ],
    },
    role: {
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
    refreshTokenHash: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true,
  },
);

// Index for efficient querying
sessionSchema.index({ user: 1, isActive: 1 });
// sessionId already has a unique index via the schema path definition; avoid duplicate index
// sessionSchema.index({ sessionId: 1 });
sessionSchema.index({ expiresAt: 1 });
sessionSchema.index({ lastActivity: 1 });

// Pre-save middleware to generate sessionId
sessionSchema.pre('save', function (next) {
  if (this.isNew && !this.sessionId) {
    this.sessionId = crypto.randomBytes(32).toString('hex');
  }
  next();
});

// Method to check if session is expired
sessionSchema.methods.isExpired = function () {
  return this.expiresAt < new Date();
};

// Method to update last activity
// Concurrency-safe activity update to avoid ParallelSaveError when multiple
// requests try to update the same session document simultaneously.
sessionSchema.methods.updateActivity = async function () {
  const now = new Date();
  await this.constructor.updateOne(
    { _id: this._id },
    { $set: { lastActivity: now } },
  );
  // Also update the in-memory instance for any downstream use in this request
  this.lastActivity = now;
  return this;
};

// Method to invalidate session
// Concurrency-safe invalidation
sessionSchema.methods.invalidate = async function () {
  const now = new Date();
  await this.constructor.updateOne(
    { _id: this._id },
    { $set: { isActive: false, logoutTime: now } },
  );
  this.isActive = false;
  this.logoutTime = now;
  return this;
};

// Static method to create new session
sessionSchema.statics.createSession = async function (user, token, req) {
  try {
    const expiresAt = new Date(
      Date.now() +
        (process.env.JWT_EXPIRES_IN_NUMERIC || 7 * 24 * 60 * 60 * 1000),
    ); // Default 7 days

    const session = new this({
      user: user._id,
      token,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      deviceInfo: this.extractDeviceInfo(req.get('User-Agent')),
      expiresAt,
      department: user.department,
      role: user.role,
    });

    return await session.save();
  } catch (error) {
    console.error('Failed to create session:', error.message);
    // Don't throw error to avoid breaking login flow
    return null;
  }
};

// Static method to find active session by token
sessionSchema.statics.findActiveByToken = function (token) {
  return this.findOne({
    token,
    isActive: true,
    expiresAt: { $gt: new Date() },
  }).populate('user');
};

// Static method to get user's active sessions
sessionSchema.statics.getUserActiveSessions = function (userId) {
  return this.find({
    user: userId,
    isActive: true,
    expiresAt: { $gt: new Date() },
  }).sort({ lastActivity: -1 });
};

// Static method to invalidate all user sessions
sessionSchema.statics.invalidateUserSessions = async function (
  userId,
  exceptSessionId = null,
) {
  const query = { user: userId, isActive: true };
  if (exceptSessionId) {
    query.sessionId = { $ne: exceptSessionId };
  }

  return this.updateMany(query, {
    isActive: false,
    logoutTime: new Date(),
  });
};

// Static method to clean expired sessions
sessionSchema.statics.cleanExpiredSessions = function () {
  return this.updateMany(
    {
      expiresAt: { $lt: new Date() },
      isActive: true,
    },
    {
      isActive: false,
      logoutTime: new Date(),
    },
  );
};

// Static method to enforce concurrent session limits
sessionSchema.statics.enforceSessionLimit = async function (
  userId,
  maxSessions = 5,
) {
  const activeSessions = await this.getUserActiveSessions(userId);

  if (activeSessions.length >= maxSessions) {
    // Invalidate oldest sessions beyond the limit
    const sessionsToInvalidate = activeSessions.slice(maxSessions - 1);
    const sessionIds = sessionsToInvalidate.map((s) => s._id);

    await this.updateMany(
      { _id: { $in: sessionIds } },
      {
        isActive: false,
        logoutTime: new Date(),
      },
    );

    return sessionsToInvalidate.length;
  }

  return 0;
};

// Helper method to extract device info from user agent
sessionSchema.statics.extractDeviceInfo = function (userAgent) {
  if (!userAgent) return 'Unknown';

  // Simple device detection
  if (userAgent.includes('Mobile')) return 'Mobile';
  if (userAgent.includes('Tablet')) return 'Tablet';
  if (userAgent.includes('Windows')) return 'Windows Desktop';
  if (userAgent.includes('Mac')) return 'Mac Desktop';
  if (userAgent.includes('Linux')) return 'Linux Desktop';

  return 'Desktop';
};

// Helper to set / rotate refresh token hash on session
sessionSchema.statics.setRefreshToken = async function (
  sessionId,
  refreshToken,
) {
  const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await this.updateOne({ sessionId }, { $set: { refreshTokenHash: hash } });
};

sessionSchema.statics.verifyRefreshToken = async function (
  sessionId,
  refreshToken,
) {
  const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const session = await this.findOne({ sessionId, isActive: true }).select(
    '+refreshTokenHash',
  );
  if (!session || session.refreshTokenHash !== hash || session.isExpired())
    return null;
  return session;
};

module.exports = mongoose.model('Session', sessionSchema);
