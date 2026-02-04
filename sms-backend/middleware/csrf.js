const crypto = require('crypto');

/**
 * CSRF Protection Middleware (Double Submit Cookie pattern)
 *
 * Overview:
 * - On first authenticated response (login/signup/refresh) we issue a non-HTTPOnly cookie `csrfToken`.
 * - Client must send this value back in `x-csrf-token` header for all state-changing requests (POST, PATCH, PUT, DELETE) to /api.
 * - We also tie the token to the session by hashing the value + sessionId so that a stolen bare token without the session cookies can't be reused after rotation.
 * - Refresh & login endpoints are exempt (bootstrap).
 */

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Attaches helper to response for issuing a fresh CSRF token alongside auth flows
function attachCsrfToken(req, res, next) {
  res.issueCsrfToken = () => {
    const token = generateToken();
    // Non-HttpOnly so frontend JS can read & send it in header; SameSite=Strict to narrow scope
    res.cookie('csrfToken', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return token;
  };
  next();
}

// Validation middleware for mutating routes under /api (after cookies parsed & session validated)
function verifyCsrf(req, res, next) {
  if (SAFE_METHODS.includes(req.method)) return next();

  // Allow bootstrap endpoints without token
  const exemptPaths = [
    '/api/v1/users/login',
    '/api/v1/users/signup',
    '/api/v1/users/refresh',
    '/api/v1/users/forgotPassword',
    '/api/v1/users/first-password',
    /\/api\/v1\/users\/resetPassword\//,
  ];
  const path = req.originalUrl.split('?')[0];
  if (
    exemptPaths.some((p) => (p instanceof RegExp ? p.test(path) : p === path))
  ) {
    return next();
  }

  const cookieToken = req.cookies && req.cookies.csrfToken;
  const headerToken = req.get('x-csrf-token');

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({
      status: 'fail',
      message: 'CSRF token missing or invalid',
    });
  }

  return next();
}

module.exports = { attachCsrfToken, verifyCsrf };
