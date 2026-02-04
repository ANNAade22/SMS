const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const xss = require('xss-clean');
const hpp = require('hpp');
const pug = require('pug');
const path = require('path');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const { attachCsrfToken, verifyCsrf } = require('./middleware/csrf');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const userRoutes = require('./routes/userRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const gradeRoutes = require('./routes/gradeRoutes');
const classRoutes = require('./routes/classRoutes');
const studentRoutes = require('./routes/studentRoutes');
const lessonRoutes = require('./routes/lessonRoutes');
const examRoutes = require('./routes/examRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');

const parentRoutes = require('./routes/parentRoutes');
const resultRoutes = require('./routes/resultRoutes');
const eventRoutes = require('./routes/eventRoutes');
const auditRoutes = require('./routes/auditRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const securityRoutes = require('./routes/securityRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const semesterRoutes = require('./routes/semesterRoutes');
const feeRoutes = require('./routes/feeRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const feeAssignmentRoutes = require('./routes/feeAssignmentRoutes');
const paymentReminderRoutes = require('./routes/paymentReminderRoutes');
const financialReportRoutes = require('./routes/financialReportRoutes');
const sessionController = require('./controllers/sessionController');
const countController = require('./controllers/countController');

const app = express();

// Enable CORS for all routes
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'https://sms-tawny-eight.vercel.app'], // Your frontend URLs
    credentials: true, // Allow cookies if you're using them
  }),
);

// app.set('view engine', 'pug');
// app.set('views', path.join(__dirname, 'views'));

// 1) GLOBAL MIDDLEWARES

// Rate limiting (dev-friendly)
const isProd = process.env.NODE_ENV === 'production';
const limiter = rateLimit({
  max: isProd ? 100 : 5000,
  windowMs: isProd ? 15 * 60 * 1000 : 60 * 1000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(429).json({
      status: 'fail',
      message: 'Too many requests, please slow down and try again shortly.',
    });
  },
});

// Auth routes limiter
const authLimiter = rateLimit({
  max: isProd ? 20 : 200,
  windowMs: 15 * 60 * 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    return res.status(429).json({
      status: 'fail',
      message: 'Too many authentication attempts, please try again later.',
    });
  },
});

// Refresh limiter (stricter window, no skip on success)
const refreshLimiter = rateLimit({
  max: isProd ? 60 : 500, // production modest, dev generous
  windowMs: 15 * 60 * 1000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(429).json({
      status: 'fail',
      message: 'Too many token refresh attempts. Please slow down.',
    });
  },
});

// API rate limiting
app.use('/api', limiter);
app.use('/api/v1/users/login', authLimiter);
app.use('/api/v1/users/signup', authLimiter);
app.use('/api/v1/users/forgotPassword', authLimiter);
app.use('/api/v1/users/refresh', refreshLimiter);

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
      },
    },
  }),
);

// Gzip compression
app.use(compression());

// Body parser with size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
// Attach helper to issue CSRF token (used in auth controller when issuing tokens)
app.use(attachCsrfToken);

// Data sanitization
app.use(require('express-mongo-sanitize')()); // Against NoSQL injection
app.use(xss()); // Against XSS attacks

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  }),
);

// 3) ROUTES
// Security monitoring middleware
app.use(
  '/api',
  require('./controllers/securityController').detectSuspiciousActivity,
);

// Attach session to authenticated requests and update activity
app.use('/api', (req, res, next) => {
  // Expose token to session validator if present
  const auth = req.headers && req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    req.token = auth.split(' ')[1];
  }
  next();
});
app.use('/api', sessionController.validateSession);
app.use('/api', sessionController.updateSessionActivity);
// CSRF verification for mutating requests after session validation
app.use('/api', verifyCsrf);

// app.use('/', viewsRouter);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/teachers', teacherRoutes);
app.use('/api/v1/subjects', subjectRoutes);
app.use('/api/v1/grades', gradeRoutes);
app.use('/api/v1/classes', classRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/lessons', lessonRoutes);
app.use('/api/v1/exams', examRoutes);
app.use('/api/v1/assignments', assignmentRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/parents', parentRoutes);
app.use('/api/v1/results', resultRoutes);
app.use('/api/v1/events', eventRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/sessions', sessionRoutes);
app.use('/api/v1/security', securityRoutes);
app.use('/api/v1/announcements', announcementRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/semesters', semesterRoutes);
app.use('/api/v1/fees', feeRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/fee-assignments', feeAssignmentRoutes);
app.use('/api/v1/payment-reminders', paymentReminderRoutes);
app.use('/api/v1/financial-reports', financialReportRoutes);

// Cache health status
app.get('/api/v1/cache/health', (req, res) => {
  res.json({
    status: 'success',
    redisEnabled:
      typeof countController._redisEnabled === 'function'
        ? countController._redisEnabled()
        : false,
    inMemoryKeys: countController._cache
      ? countController._cache.size
      : undefined,
    ttlMs: process.env.COUNT_CACHE_TTL_MS || 'default',
  });
});

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
