// controllers/countController.js
// Lightweight count endpoints with caching (in-memory or Redis) and basic filter support + date ranges
const catchAsync = require('../utils/catchAsync');
let redisClient = null;
let redisEnabled = false;
const { createClient } = (() => {
  try {
    // Lazy require so Redis is optional
    // eslint-disable-next-line global-require
    return require('redis');
  } catch (e) {
    return {};
  }
})();

// Simple in-memory cache
// key: cacheKey, value: { total, expires }
const countCache = new Map();
const TTL_MS = parseInt(process.env.COUNT_CACHE_TTL_MS || '30000', 10);

// Initialize Redis if configured
if (process.env.REDIS_URL && createClient) {
  try {
    redisClient = createClient({ url: process.env.REDIS_URL });
    redisClient.on('error', (err) => {
      console.warn(
        'Redis error, falling back to in-memory cache:',
        err.message,
      );
      redisEnabled = false;
    });
    redisClient.connect().then(() => {
      redisEnabled = true;
      console.log('CountController: Redis cache enabled');
    });
  } catch (e) {
    console.warn('Redis init failed, using in-memory cache only:', e.message);
  }
}

const buildFilter = (req) => {
  const q = req.query || {};
  const filter = {};
  // Generic optional filters (only applied if present)
  if (q.role) filter.role = q.role; // users
  if (q.grade) filter.grade = q.grade; // subjects/classes/students (ObjectId or string)
  if (q.class) filter.class = q.class; // students
  if (q.status) filter.status = q.status; // subjects or active flag
  if (q.department) filter.department = q.department; // users
  // Date range filtering: createdAt[gte], createdAt[lte]
  if (q['createdAt[gte]'] || q['createdAt[lte]']) {
    filter.createdAt = {};
    if (q['createdAt[gte]'])
      filter.createdAt.$gte = new Date(q['createdAt[gte]']);
    if (q['createdAt[lte]'])
      filter.createdAt.$lte = new Date(q['createdAt[lte]']);
  }
  return filter;
};

const makeCacheKey = (modelName, filter) =>
  `${modelName}:${Object.keys(filter)
    .sort()
    .map((k) => `${k}=${filter[k]}`)
    .join('|')}`;

async function getCached(cacheKey) {
  const now = Date.now();
  if (redisEnabled && redisClient) {
    const data = await redisClient.get(cacheKey);
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed.expires > now) return parsed;
    }
    return null;
  }
  const local = countCache.get(cacheKey);
  if (local && local.expires > now) return local;
  return null;
}

async function setCached(cacheKey, value) {
  if (redisEnabled && redisClient) {
    await redisClient.set(cacheKey, JSON.stringify(value), {
      PX: value.expires - Date.now(),
    });
  } else {
    countCache.set(cacheKey, value);
  }
}

exports.buildCountHandler = (Model) =>
  catchAsync(async (req, res, next) => {
    const filter = buildFilter(req);
    const cacheKey = makeCacheKey(Model.modelName, filter);
    const cached = await getCached(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      res.set('X-Total-Count', cached.total.toString());
      return res
        .status(200)
        .json({ status: 'success', total: cached.total, cached: true });
    }
    const total = await Model.countDocuments(filter);
    const entry = { total, expires: Date.now() + TTL_MS };
    await setCached(cacheKey, entry);
    res.set('X-Cache', 'MISS');
    res.set('X-Total-Count', total.toString());
    return res.status(200).json({ status: 'success', total, cached: false });
  });

exports.buildHeadCountHandler = (Model) =>
  catchAsync(async (req, res, next) => {
    const filter = buildFilter(req);
    const cacheKey = makeCacheKey(Model.modelName, filter);
    const cached = await getCached(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      res.set('X-Total-Count', cached.total.toString());
      return res.status(204).end();
    }
    const total = await Model.countDocuments(filter);
    const entry = { total, expires: Date.now() + TTL_MS };
    await setCached(cacheKey, entry);
    res.set('X-Cache', 'MISS');
    res.set('X-Total-Count', total.toString());
    return res.status(204).end();
  });

// Expose for potential test inspection
exports._cache = countCache;
exports._redisEnabled = () => redisEnabled;
