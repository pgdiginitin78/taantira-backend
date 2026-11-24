const { ROLES, ADMIN_ROLES } = require('../config/constants');
const { AppError } = require('../utils/errors');

const requireRoles = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
  }
  const userRoles = req.user.roles || [];
  if (userRoles.includes(ROLES.SUPER_ADMIN)) {
    return next();
  }
  const matched = allowedRoles.some((role) => userRoles.includes(role));
  if (!matched) {
    return next(new AppError('Insufficient role privileges', 403, 'FORBIDDEN'));
  }
  return next();
};

const requirePermissions = (...requiredPermissions) => (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
  }
  const userRoles = req.user.roles || [];
  if (userRoles.includes(ROLES.SUPER_ADMIN)) {
    return next();
  }
  const userPerms = new Set(req.user.permissions || []);
  const hasPermission = requiredPermissions.every((perm) => userPerms.has(perm));
  if (!hasPermission) {
    return next(new AppError('You do not have permission for this action', 403, 'FORBIDDEN'));
  }
  return next();
};

const requireAdminAccess = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
  }
  const isStaff = (req.user.roles || []).some((role) => ADMIN_ROLES.includes(role));
  if (!isStaff) {
    return next(new AppError('Admin portal access denied', 403, 'FORBIDDEN'));
  }
  return next();
};

module.exports = { requireRoles, requirePermissions, requireAdminAccess };
