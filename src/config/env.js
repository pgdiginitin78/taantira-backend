require('dotenv').config();

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const isVercelOrProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: isVercelOrProd,
  port: toInt(process.env.PORT, 5000),
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: toInt(process.env.DB_PORT, 3306),
    database: process.env.DB_NAME || 'taantira_db',
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    dialect: 'mysql',
    poolMax: toInt(process.env.DB_POOL_MAX, 10),
    poolMin: toInt(process.env.DB_POOL_MIN, 0),
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'taantira_dev_access_secret_change_me',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'taantira_dev_refresh_secret_change_me',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresDays: toInt(process.env.JWT_REFRESH_EXPIRES_DAYS, 30),
  },
  cookies: {
    secure: process.env.COOKIE_SECURE !== undefined ? process.env.COOKIE_SECURE === 'true' : isVercelOrProd,
    sameSite: process.env.COOKIE_SAME_SITE || (isVercelOrProd ? 'none' : 'lax'),
  },
  corsOrigins: (
    process.env.CORS_ORIGIN ||
    (isVercelOrProd
      ? 'https://taantira-frontend.vercel.app'
      : 'http://localhost:5173,http://localhost:5174')
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  osrmBaseUrl: (process.env.OSRM_BASE_URL || '').trim(),
  maxMediaSizeBytes: toInt(process.env.MAX_MEDIA_SIZE_BYTES, 2 * 1024 * 1024),
  rateLimit: {
    windowMs: toInt(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max: toInt(process.env.RATE_LIMIT_MAX, 300),
    authMax: toInt(process.env.AUTH_RATE_LIMIT_MAX, 25),
  },
};

module.exports = env;
