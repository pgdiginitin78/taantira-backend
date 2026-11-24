const env = require('../config/env');
const authService = require('../services/auth.service');
const { sendSuccess } = require('../utils/response');

const REFRESH_COOKIE_NAME = 'taantira_refresh_token';

const setRefreshCookie = (res, token) => {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.cookies.secure,
    sameSite: env.cookies.sameSite,
    path: '/api/auth',
    maxAge: env.jwt.refreshExpiresDays * 24 * 60 * 60 * 1000,
  });
};

const clearRefreshCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.cookies.secure,
    sameSite: env.cookies.sameSite,
    path: '/api/auth',
  });
};

const register = async (req, res, next) => {
  try {
    const result = await authService.registerCustomer({
      ...req.body,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
    setRefreshCookie(res, result.refreshToken);
    return sendSuccess(
      res,
      {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      },
      'Account registered successfully',
      201
    );
  } catch (err) {
    return next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const result = await authService.loginUser({
      ...req.body,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
    setRefreshCookie(res, result.refreshToken);
    return sendSuccess(
      res,
      {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      },
      'Logged in successfully'
    );
  } catch (err) {
    return next(err);
  }
};

const refresh = async (req, res, next) => {
  try {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
    const result = await authService.rotateRefreshToken({
      rawRefreshToken,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
    setRefreshCookie(res, result.refreshToken);
    return sendSuccess(
      res,
      {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      },
      'Token refreshed'
    );
  } catch (err) {
    return next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
    await authService.revokeRefreshToken(rawRefreshToken);
    clearRefreshCookie(res);
    return sendSuccess(res, null, 'Logged out successfully');
  } catch (err) {
    return next(err);
  }
};

const me = async (req, res) => {
  return sendSuccess(res, { user: req.user }, 'Authenticated user profile');
};

module.exports = { register, login, refresh, logout, me };
