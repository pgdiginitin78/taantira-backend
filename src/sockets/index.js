const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { ADMIN_ROLES } = require('../config/constants');
const { loadUserAuthContext } = require('../middleware/auth');
const { Order, DeliveryPartner, DeliveryAssignment, DeliveryPartnerCurrentLocation, DeliveryLocationHistory } = require('../models');
const { setSocketServer } = require('../services/notification.service');

const isStaff = (user) => (user?.roles || []).some((r) => ADMIN_ROLES.includes(r));

const initializeSockets = (io) => {
  setSocketServer(io);

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) {
        return next(new Error('Socket authentication required'));
      }
      const decoded = jwt.verify(token, env.jwt.accessSecret);
      const userContext = await loadUserAuthContext(decoded.sub);
      if (!userContext) {
        return next(new Error('Invalid socket user'));
      }
      socket.user = userContext;
      return next();
    } catch {
      return next(new Error('Socket authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.user.id}`);

    if (isStaff(socket.user)) {
      socket.join('admin:tracking');
    }

    socket.on('order:join', async ({ orderId }) => {
      if (!orderId) return;
      const order = await Order.findByPk(orderId, { attributes: ['id', 'user_id'] });
      if (!order) return;

      const isOwner = Number(order.user_id) === Number(socket.user.id);
      const partner = await DeliveryPartner.findOne({ where: { user_id: socket.user.id } });
      const hasAssignment = partner
        ? await DeliveryAssignment.findOne({ where: { order_id: order.id, delivery_partner_id: partner.id } })
        : null;

      if (isOwner || hasAssignment || isStaff(socket.user)) {
        socket.join(`order:${order.id}`);
        socket.emit('order:joined', { orderId: order.id });
      } else {
        socket.emit('socket:error', { message: 'Unauthorized to subscribe to this order tracking room' });
      }
    });

    socket.on('partner:location_update', async (payload) => {
      try {
        const partner = await DeliveryPartner.findOne({ where: { user_id: socket.user.id } });
        if (!partner || partner.approval_status !== 'approved') {
          socket.emit('socket:error', { message: 'Only approved delivery partners can broadcast GPS' });
          return;
        }

        const { latitude, longitude, accuracy_meters = null, delivery_assignment_id = null } = payload || {};
        if (typeof latitude !== 'number' || typeof longitude !== 'number') return;

        const now = new Date();
        await DeliveryPartnerCurrentLocation.upsert({
          delivery_partner_id: partner.id,
          delivery_assignment_id,
          latitude,
          longitude,
          accuracy_meters,
          recorded_at: now,
        });

        await DeliveryLocationHistory.create({
          delivery_partner_id: partner.id,
          delivery_assignment_id,
          latitude,
          longitude,
          accuracy_meters,
          recorded_at: now,
        });

        const broadcast = {
          delivery_partner_id: partner.id,
          delivery_assignment_id,
          latitude,
          longitude,
          accuracy_meters,
          recorded_at: now.toISOString(),
        };

        io.to('admin:tracking').emit('tracking:location', broadcast);

        if (delivery_assignment_id) {
          const assignment = await DeliveryAssignment.findByPk(delivery_assignment_id);
          if (assignment && Number(assignment.delivery_partner_id) === Number(partner.id)) {
            io.to(`order:${assignment.order_id}`).emit('tracking:location', {
              ...broadcast,
              order_id: assignment.order_id,
            });
          }
        }
      } catch (err) {
        socket.emit('socket:error', { message: err.message });
      }
    });
  });

  return io;
};

module.exports = { initializeSockets };
