const multer = require('multer');
const env = require('../config/env');
const { AppError } = require('../utils/errors');

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const hasValidMagicBytes = (buffer, mimeType) => {
  if (!buffer || buffer.length < 12) return false;
  if (mimeType === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === 'image/png') {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  }
  if (mimeType === 'image/webp') {
    return (
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }
  return false;
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.maxMediaSizeBytes,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new AppError('Only JPEG, PNG, and WebP images are permitted', 400, 'INVALID_FILE_TYPE'));
    }
    return cb(null, true);
  },
});

module.exports = { upload, hasValidMagicBytes, ALLOWED_MIME_TYPES };
