const { Notification } = require('../models');

let ioInstance = null;

const setSocketServer = (io) => {
  ioInstance = io;
};

const getSocketServer = () => ioInstance;

const createNotification = async ({
  userId,
  title,
  message,
  category = 'system',
  linkUrl = null,
  transaction = null,
}) => {
  const record = await Notification.create(
    {
      user_id: userId,
      title,
      message,
      category,
      link_url: linkUrl,
    },
    { transaction }
  );

  if (ioInstance) {
    ioInstance.to(`user:${userId}`).emit('notification:new', {
      id: record.id,
      title: record.title,
      message: record.message,
      category: record.category,
      link_url: record.link_url,
      created_at: record.created_at,
    });
  }

  return record;
};

module.exports = { setSocketServer, getSocketServer, createNotification };
