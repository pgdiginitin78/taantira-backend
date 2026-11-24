const { AppError } = require('../utils/errors');

const validate = (schema, source = 'body') => async (req, res, next) => {
  try {
    const validated = await schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });
    req[source] = validated;
    return next();
  } catch (err) {
    if (err.name === 'ValidationError') {
      const fieldErrors = {};
      for (const issue of err.inner || []) {
        if (issue.path && !fieldErrors[issue.path]) {
          fieldErrors[issue.path] = issue.message;
        }
      }
      return next(new AppError(err.message || 'Validation failed', 422, 'VALIDATION_ERROR', fieldErrors));
    }
    return next(err);
  }
};

module.exports = { validate };
