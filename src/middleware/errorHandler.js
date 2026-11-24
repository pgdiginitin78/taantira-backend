const { sendError } = require('../utils/response');

const notFoundHandler = (req, res) => {
  return sendError(res, `Route ${req.method} ${req.originalUrl} not found`, 404, 'NOT_FOUND');
};

const errorHandler = (err, req, res, _next) => {
  if (err.name === 'MulterError') {
    return sendError(res, err.message, 400, 'UPLOAD_ERROR');
  }
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors?.[0]?.path || 'record';
    return sendError(res, `Duplicate value for ${field}`, 409, 'CONFLICT', err.errors);
  }
  if (err.name === 'SequelizeConnectionRefusedError' || err.name === 'SequelizeConnectionError') {
    return sendError(
      res,
      'Database connection unavailable. Please ensure MySQL Community Edition is running and configured in backend/.env.',
      503,
      'DATABASE_UNAVAILABLE'
    );
  }

  const statusCode = err.statusCode || 500;
  const code = err.code || (statusCode >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR');
  const message = statusCode >= 500 && process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message || 'An unexpected error occurred';

  return sendError(res, message, statusCode, code, err.details || null);
};

module.exports = { notFoundHandler, errorHandler };
