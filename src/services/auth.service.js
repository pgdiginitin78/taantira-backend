const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { ROLES } = require('../config/constants');
const {
  sequelize,
  User,
  Role,
  UserRole,
  RefreshToken,
  CustomerProfile,
  Wishlist,
} = require('../models');
const { loadUserAuthContext } = require('../middleware/auth');
const { AppError } = require('../utils/errors');

const hashToken = (rawToken) => crypto.createHash('sha256').update(rawToken).digest('hex');

const signAccessToken = (userContext) =>
  jwt.sign(
    {
      sub: userContext.id,
      email: userContext.email,
      roles: userContext.roles,
    },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessExpiresIn }
  );

const issueTokenPair = async ({ userId, userAgent = null, ipAddress = null, transaction = null }) => {
  const userContext = await loadUserAuthContext(userId);
  if (!userContext) {
    throw new AppError('User account inactive or unavailable', 401, 'UNAUTHORIZED');
  }

  const accessToken = signAccessToken(userContext);
  const rawRefreshToken = crypto.randomBytes(48).toString('hex');
  const tokenHash = hashToken(rawRefreshToken);
  const expiresAt = new Date(Date.now() + env.jwt.refreshExpiresDays * 24 * 60 * 60 * 1000);

  await RefreshToken.create(
    {
      user_id: userId,
      token_hash: tokenHash,
      user_agent: userAgent,
      ip_address: ipAddress,
      expires_at: expiresAt,
    },
    { transaction }
  );

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    user: userContext,
  };
};

const registerCustomer = async ({ full_name, email, phone, password, userAgent, ipAddress }) => {
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    throw new AppError('An account with this email already exists', 409, 'EMAIL_EXISTS');
  }

  const password_hash = await bcrypt.hash(password, 10);

  const createdUser = await sequelize.transaction(async (transaction) => {
    const user = await User.create(
      {
        full_name,
        email,
        phone,
        password_hash,
        status: 'active',
        is_email_verified: false,
      },
      { transaction }
    );

    const customerRole = await Role.findOne({ where: { slug: ROLES.CUSTOMER }, transaction });
    if (customerRole) {
      await UserRole.create({ user_id: user.id, role_id: customerRole.id }, { transaction });
    }

    await CustomerProfile.create({ user_id: user.id }, { transaction });
    await Wishlist.create({ user_id: user.id }, { transaction });
    return user;
  });

  return issueTokenPair({ userId: createdUser.id, userAgent, ipAddress });
};

const loginUser = async ({ email, password, userAgent, ipAddress }) => {
  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }
  if (user.status !== 'active') {
    throw new AppError('Your account is currently inactive or suspended', 403, 'ACCOUNT_INACTIVE');
  }

  const passwordValid = await bcrypt.compare(password, user.password_hash);
  if (!passwordValid) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  await user.update({ last_login_at: new Date() });
  return issueTokenPair({ userId: user.id, userAgent, ipAddress });
};

const rotateRefreshToken = async ({ rawRefreshToken, userAgent, ipAddress }) => {
  if (!rawRefreshToken) {
    throw new AppError('Refresh token missing', 401, 'REFRESH_MISSING');
  }
  const tokenHash = hashToken(rawRefreshToken);
  const stored = await RefreshToken.findOne({ where: { token_hash: tokenHash } });

  if (!stored) {
    throw new AppError('Invalid refresh token', 401, 'REFRESH_INVALID');
  }
  if (stored.revoked_at) {
    // Token reuse detected -> revoke all active sessions for user
    await RefreshToken.update(
      { revoked_at: new Date() },
      { where: { user_id: stored.user_id, revoked_at: null } }
    );
    throw new AppError('Refresh token reuse detected. Please log in again.', 401, 'REFRESH_REUSED');
  }
  if (new Date(stored.expires_at) < new Date()) {
    throw new AppError('Refresh token expired', 401, 'REFRESH_EXPIRED');
  }

  const nextTokens = await issueTokenPair({ userId: stored.user_id, userAgent, ipAddress });
  await stored.update({
    revoked_at: new Date(),
    replaced_by_token_hash: hashToken(nextTokens.refreshToken),
  });

  return nextTokens;
};

const revokeRefreshToken = async (rawRefreshToken) => {
  if (!rawRefreshToken) return;
  const tokenHash = hashToken(rawRefreshToken);
  await RefreshToken.update(
    { revoked_at: new Date() },
    { where: { token_hash: tokenHash, revoked_at: null } }
  );
};

module.exports = {
  hashToken,
  signAccessToken,
  issueTokenPair,
  registerCustomer,
  loginUser,
  rotateRefreshToken,
  revokeRefreshToken,
};
