function errorHandler(err, req, res, next) {
  console.error('[server error]', err);
  if (process.env.SENTRY_DSN) {
    try {
      const Sentry = require('@sentry/node');
      Sentry.captureException(err, { extra: { url: req.url, method: req.method } });
    } catch (_) {}
  }
  res.status(err.statusCode || err.status || 500).json({ error: err.message || 'Internal server error' });
}

module.exports = { errorHandler };
