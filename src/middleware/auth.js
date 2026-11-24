const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { User, Role, Permission } = require('../models');
const { AppError } = require('../utils/errors');

const loadUserAuthContext = async (userId) => {
  const user = await User.findByPk(userId, {
    attributes: ['id', 'full_name', 'email', 'phone', 'status'],
    include: [
      {
        model: Role,
        as: 'roles',
        attributes: ['id', 'name', 'slug'],
        through: { attributes: [] },
        include: [
          {
            model: Permission,
            as: 'permissions',
            attributes: ['id', 'slug'],
            through: { attributes: [] },
          },
        ],
      },
    ],
  });

  if (!user || user.status !== 'active') {
    return null;
  }

  const roleSlugs = (user.roles || []).map((r) => r.slug);
  const permissionSet = new Set();
  for (const role of user.roles || []) {
    for (const perm of role.permissions || []) {
      permissionSet.add(perm.slug);
    }
  }

  return {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    phone: user.phone,
    roles: roleSlugs,
    permissions: Array.from(permissionSet),
  };
};

const extractBearerToken = (req) => {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
};

const authenticate = async (req, res, next) => {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }

    const decoded = jwt.verify(token, env.jwt.accessSecret);
    const userContext = await loadUserAuthContext(decoded.sub);
    if (!userContext) {
      return next(new AppError('Invalid or inactive account', 401, 'UNAUTHORIZED'));
    }

    req.user = userContext;
    return next();
  } catch (err) {
    return next(new AppError('Invalid or expired access token', 401, 'TOKEN_EXPIRED', err.message));
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      req.user = null;
      return next();
    }
    const decoded = jwt.verify(token, env.jwt.accessSecret);
    req.user = await loadUserAuthContext(decoded.sub);
    return next();
  } catch {
    req.user = null;
    return next();
  }
};

module.exports = { authenticate, optionalAuth, loadUserAuthContext };
