const mongoose = require('mongoose');

const securityEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: [
        'BRUTE_FORCE_ATTEMPT',
        'SUSPICIOUS_IP',
        'MULTIPLE_FAILED_LOGINS',
        'UNUSUAL_LOGIN_TIME',
        'ACCOUNT_LOCKOUT',
        'SUSPICIOUS_DEVICE',
        'RATE_LIMIT_EXCEEDED',
        'SUSPICIOUS_ACTIVITY',
        'POTENTIAL_ATTACK',
        'UNAUTHORIZED_ACCESS_ATTEMPT',
        'SESSION_HIJACKING_ATTEMPT',
        'PASSWORD_POLICY_VIOLATION',
        'WEAK_PASSWORD_DETECTED',
        'TOKEN_REFRESH',
      ],
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: String,
    location: {
      country: String,
      city: String,
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
    },
    deviceInfo: {
      type: String,
      default: 'Unknown',
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    isResolved: {
      type: Boolean,
      default: false,
    },
    resolvedAt: Date,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    actions: [
      {
        action: {
          type: String,
          enum: [
            'BLOCK_IP',
            'LOCK_ACCOUNT',
            'NOTIFY_ADMIN',
            'LOG_ONLY',
            'WHITELIST',
          ],
        },
        performedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        performedAt: {
          type: Date,
          default: Date.now,
        },
        notes: String,
      },
    ],
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// Index for efficient querying
securityEventSchema.index({ type: 1, timestamp: -1 });
securityEventSchema.index({ user: 1, timestamp: -1 });
securityEventSchema.index({ ipAddress: 1, timestamp: -1 });
securityEventSchema.index({ severity: 1, timestamp: -1 });
securityEventSchema.index({ riskScore: -1 });

// Static method to log security events
securityEventSchema.statics.logSecurityEvent = async function (data) {
  try {
    // Calculate risk score based on event type and context
    const riskScore = this.calculateRiskScore(data.type, data.details);

    const event = new this({
      ...data,
      riskScore,
      severity: this.determineSeverity(data.type, riskScore),
    });

    await event.save();

    // Auto-resolve low-risk events or trigger alerts for high-risk events
    if (riskScore >= 80) {
      await this.triggerSecurityAlert(event);
    }

    return event;
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
};

// Calculate risk score based on event type and context
securityEventSchema.statics.calculateRiskScore = function (type, details = {}) {
  const baseScores = {
    BRUTE_FORCE_ATTEMPT: 70,
    SUSPICIOUS_IP: 60,
    MULTIPLE_FAILED_LOGINS: 65,
    UNUSUAL_LOGIN_TIME: 45,
    ACCOUNT_LOCKOUT: 55,
    SUSPICIOUS_DEVICE: 50,
    RATE_LIMIT_EXCEEDED: 40,
    SUSPICIOUS_ACTIVITY: 55,
    POTENTIAL_ATTACK: 85,
    UNAUTHORIZED_ACCESS_ATTEMPT: 75,
    SESSION_HIJACKING_ATTEMPT: 90,
    PASSWORD_POLICY_VIOLATION: 35,
    WEAK_PASSWORD_DETECTED: 30,
  };

  let score = baseScores[type] || 50;

  // Adjust score based on additional factors
  if (details.failedAttempts > 10) score += 15;
  if (details.isFromBlockedCountry) score += 20;
  if (details.unusualLocation) score += 10;
  if (details.multipleDevices) score += 5;

  return Math.min(score, 100);
};

// Determine severity based on type and risk score
securityEventSchema.statics.determineSeverity = function (type, riskScore) {
  if (
    riskScore >= 80 ||
    ['SESSION_HIJACKING_ATTEMPT', 'POTENTIAL_ATTACK'].includes(type)
  ) {
    return 'CRITICAL';
  } else if (
    riskScore >= 60 ||
    ['BRUTE_FORCE_ATTEMPT', 'UNAUTHORIZED_ACCESS_ATTEMPT'].includes(type)
  ) {
    return 'HIGH';
  } else if (riskScore >= 40) {
    return 'MEDIUM';
  }
  return 'LOW';
};

// Trigger security alert for high-risk events
securityEventSchema.statics.triggerSecurityAlert = async function (event) {
  // This would integrate with your notification system
  console.log(
    `🚨 SECURITY ALERT: ${event.type} detected for user ${event.user} from IP ${event.ipAddress}`,
  );

  // You could send emails, SMS, or integrate with monitoring systems here
  // For now, we'll just log it
};

// Get security events by risk level
securityEventSchema.statics.getHighRiskEvents = function (options = {}) {
  const { limit = 50, startDate, endDate } = options;

  const query = {
    severity: { $in: ['HIGH', 'CRITICAL'] },
    isResolved: false,
  };

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = startDate;
    if (endDate) query.timestamp.$lte = endDate;
  }

  return this.find(query)
    .sort({ riskScore: -1, timestamp: -1 })
    .limit(limit)
    .populate('user', 'username email')
    .populate('resolvedBy', 'username');
};

// Get security statistics
securityEventSchema.statics.getSecurityStats = async function (timeframe = 30) {
  const startDate = new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000);

  const stats = await this.aggregate([
    { $match: { timestamp: { $gte: startDate } } },
    {
      $group: {
        _id: {
          type: '$type',
          severity: '$severity',
        },
        count: { $sum: 1 },
        avgRiskScore: { $avg: '$riskScore' },
      },
    },
    {
      $group: {
        _id: '$_id.severity',
        events: {
          $push: {
            type: '$_id.type',
            count: '$count',
            avgRiskScore: '$avgRiskScore',
          },
        },
        totalCount: { $sum: '$count' },
      },
    },
  ]);

  return stats;
};

module.exports = mongoose.model('SecurityEvent', securityEventSchema);
