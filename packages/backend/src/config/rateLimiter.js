function makeRateLimiter({ windowMs, max, message }) {
  const store = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of store) {
      if (now > entry.resetAt) store.delete(ip);
    }
  }, 10 * 60 * 1000).unref();

  return function rateLimitMiddleware(req, res, next) {
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    let entry = store.get(ip);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(ip, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      return res.status(429).json(
        typeof message === 'object' ? message : { error: message || 'Too many requests.' }
      );
    }
    next();
  };
}

const authLimiter = makeRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many auth attempts. Please wait 15 minutes before trying again.' },
});

const apiLimiter = makeRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: 'Too many requests. Please slow down.' },
});

const globalLimiter = makeRateLimiter({
  windowMs: 60 * 1000,
  max: 300,
  message: { error: 'Too many requests.' },
});

module.exports = { makeRateLimiter, authLimiter, apiLimiter, globalLimiter };
