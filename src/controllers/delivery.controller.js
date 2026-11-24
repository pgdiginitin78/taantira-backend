const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Op } = require('sequelize');
const {
  sequelize,
  User,
  Role,
  UserRole,
  DeliveryPartner,
  DeliveryDocument,
  DeliveryVehicle,
  DeliveryZone,
  DeliveryZonePincode,
  DeliveryAssignment,
  DeliveryStatusHistory,
  DeliveryPartnerCurrentLocation,
  DeliveryLocationHistory,
  DeliveryProof,
  CourierShipment,
  CourierTrackingEvent,
  DeliveryEarning,
  DeliverySettlement,
  Order,
  OrderAddress,
  OrderItem,
  OrderStatusHistory,
  Payment,
  PaymentTransaction,
} = require('../models');
const { ROLES, ADMIN_ROLES, STALE_LOCATION_THRESHOLD_SECONDS } = require('../config/constants');
const { createNotification, getSocketServer } = require('../services/notification.service');
const { getRouteBetweenPoints } = require('../services/osrm.service');
const { recordAuditLog } = require('../middleware/audit');
const { sendSuccess } = require('../utils/response');
const { AppError } = require('../utils/errors');

const isStaff = (user) => (user?.roles || []).some((r) => ADMIN_ROLES.includes(r));

const registerPartner = async (req, res, next) => {
  try {
    const {
      full_name,
      email,
      phone,
      password,
      address,
      city,
      state,
      pincode,
      service_pincodes,
      vehicle_type,
      vehicle_number,
      model_name,
      doc_type,
      doc_number_masked,
    } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) return next(new AppError('Email is already registered', 409, 'EMAIL_EXISTS'));

    const password_hash = await bcrypt.hash(password, 10);
    const partnerCode = `TAN-DP-${crypto.randomInt(1000, 9999)}`;

    const created = await sequelize.transaction(async (transaction) => {
      const user = await User.create(
        { full_name, email, phone, password_hash, status: 'active' },
        { transaction }
      );
      const dpRole = await Role.findOne({ where: { slug: ROLES.DELIVERY_PARTNER }, transaction });
      if (dpRole) {
        await UserRole.create({ user_id: user.id, role_id: dpRole.id }, { transaction });
      }

      const partner = await DeliveryPartner.create(
        {
          user_id: user.id,
          partner_code: partnerCode,
          address,
          city,
          state,
          pincode,
          service_pincodes_json: service_pincodes,
          approval_status: 'pending',
          invited_by: req.user?.id || null,
        },
        { transaction }
      );

      await DeliveryVehicle.create(
        { delivery_partner_id: partner.id, vehicle_type, vehicle_number, model_name: model_name || null },
        { transaction }
      );

      await DeliveryDocument.create(
        { delivery_partner_id: partner.id, doc_type, doc_number_masked, verification_status: 'pending' },
        { transaction }
      );

      return { user: { id: user.id, full_name, email, phone }, partner };
    });

    return sendSuccess(res, created, 'Delivery partner application submitted for admin verification', 201);
  } catch (err) {
    return next(err);
  }
};

const listPartnersAdmin = async (req, res, next) => {
  try {
    const partners = await DeliveryPartner.findAll({
      include: [
        { model: User, as: 'user', attributes: ['id', 'full_name', 'email', 'phone', 'status'] },
        { model: DeliveryVehicle, as: 'vehicles' },
        { model: DeliveryDocument, as: 'documents' },
        { model: DeliveryPartnerCurrentLocation, as: 'currentLocation' },
      ],
      order: [['created_at', 'DESC']],
    });
    return sendSuccess(res, partners);
  } catch (err) {
    return next(err);
  }
};

const verifyPartnerAdmin = async (req, res, next) => {
  try {
    const partner = await DeliveryPartner.findByPk(req.params.id);
    if (!partner) return next(new AppError('Delivery partner not found', 404, 'NOT_FOUND'));

    const { approval_status, rejection_reason = null } = req.body;
    await sequelize.transaction(async (transaction) => {
      await partner.update(
        {
          approval_status,
          rejection_reason,
          approved_by: req.user.id,
          approved_at: approval_status === 'approved' ? new Date() : null,
        },
        { transaction }
      );

      if (approval_status === 'approved') {
        await DeliveryDocument.update(
          { verification_status: 'verified', verified_by: req.user.id, verified_at: new Date() },
          { where: { delivery_partner_id: partner.id }, transaction }
        );
      }

      await createNotification({
        userId: partner.user_id,
        title: `Partner Application ${approval_status.toUpperCase()}`,
        message:
          approval_status === 'approved'
            ? 'Your Taantira delivery partner profile is approved. You can now go online and accept deliveries.'
            : `Your delivery partner status is ${approval_status}. ${rejection_reason || ''}`,
        category: 'partner',
        linkUrl: '/delivery',
        transaction,
      });

      await recordAuditLog({
        actorId: req.user.id,
        action: 'PARTNER_VERIFIED',
        entityType: 'delivery_partner',
        entityId: partner.id,
        newValues: { approval_status, rejection_reason },
        ipAddress: req.ip,
        transaction,
      });
    });

    return sendSuccess(res, partner, `Partner marked as ${approval_status}`);
  } catch (err) {
    return next(err);
  }
};

const getPartnerDashboard = async (req, res, next) => {
  try {
    const partner = await DeliveryPartner.findOne({
      where: { user_id: req.user.id },
      include: [
        { model: DeliveryVehicle, as: 'vehicles' },
        { model: DeliveryDocument, as: 'documents' },
        { model: DeliveryPartnerCurrentLocation, as: 'currentLocation' },
      ],
    });
    if (!partner) return next(new AppError('Delivery partner profile not found', 404, 'NOT_FOUND'));

    const [assignments, earnings, settlements] = await Promise.all([
      DeliveryAssignment.findAll({
        where: { delivery_partner_id: partner.id },
        include: [
          {
            model: Order,
            as: 'order',
            attributes: ['id', 'order_number', 'status', 'payment_method', 'payment_status', 'total_amount', 'placed_at'],
            include: [
              { model: OrderAddress, as: 'shippingAddress' },
              { model: OrderItem, as: 'items' },
            ],
          },
          { model: DeliveryProof, as: 'proof' },
        ],
        order: [['assigned_at', 'DESC']],
      }),
      DeliveryEarning.findAll({ where: { delivery_partner_id: partner.id }, order: [['earned_at', 'DESC']] }),
      DeliverySettlement.findAll({ where: { delivery_partner_id: partner.id }, order: [['created_at', 'DESC']] }),
    ]);

    const pendingAssignments = assignments.filter((a) => a.status === 'assigned');
    const activeAssignments = assignments.filter((a) => ['accepted', 'picked_up', 'out_for_delivery'].includes(a.status));
    const completedDeliveries = assignments.filter((a) => a.status === 'delivered');

    return sendSuccess(res, {
      partner,
      stats: {
        pending_count: pendingAssignments.length,
        active_count: activeAssignments.length,
        completed_count: completedDeliveries.length,
        total_earnings: earnings.reduce((s, e) => s + Number(e.amount) + Number(e.bonus_amount), 0),
        pending_payout: earnings.filter((e) => e.status === 'pending').reduce((s, e) => s + Number(e.amount) + Number(e.bonus_amount), 0),
      },
      pending_assignments: pendingAssignments,
      active_assignments: activeAssignments,
      delivery_history: completedDeliveries,
      earnings,
      settlements,
    });
  } catch (err) {
    return next(err);
  }
};

const toggleAvailability = async (req, res, next) => {
  try {
    const partner = await DeliveryPartner.findOne({ where: { user_id: req.user.id } });
    if (!partner) return next(new AppError('Partner profile not found', 404, 'NOT_FOUND'));
    if (partner.approval_status !== 'approved') {
      return next(new AppError('Only verified and approved partners can go online', 403, 'PARTNER_NOT_APPROVED'));
    }

    const isOnline = Boolean(req.body.is_online);
    await partner.update({
      is_online: isOnline,
      current_availability: isOnline ? 'available' : 'offline',
    });
    return sendSuccess(res, partner, isOnline ? 'You are now Online' : 'You are now Offline');
  } catch (err) {
    return next(err);
  }
};

const assignOrderToPartner = async (req, res, next) => {
  try {
    const { order_id, delivery_partner_id } = req.body;
    const [order, partner] = await Promise.all([
      Order.findByPk(order_id),
      DeliveryPartner.findByPk(delivery_partner_id),
    ]);
    if (!order) return next(new AppError('Order not found', 404, 'NOT_FOUND'));
    if (!partner || partner.approval_status !== 'approved') {
      return next(new AppError('Approved delivery partner required', 400, 'PARTNER_NOT_APPROVED'));
    }

    const assignment = await sequelize.transaction(async (transaction) => {
      const otpCode = order.delivery_otp_code || String(crypto.randomInt(100000, 999999));
      await order.update(
        { delivery_mode: 'own_partner', delivery_otp_code: otpCode },
        { transaction }
      );

      const created = await DeliveryAssignment.create(
        {
          order_id: order.id,
          delivery_partner_id: partner.id,
          status: 'assigned',
          assigned_by: req.user.id,
          assigned_at: new Date(),
        },
        { transaction }
      );

      await DeliveryStatusHistory.create(
        {
          delivery_assignment_id: created.id,
          status: 'assigned',
          note: `Assigned to ${partner.partner_code}`,
          changed_by: req.user.id,
        },
        { transaction }
      );

      await createNotification({
        userId: partner.user_id,
        title: `New Delivery Assignment: ${order.order_number}`,
        message: 'You have a new delivery request. Please accept or decline in your partner dashboard.',
        category: 'delivery',
        linkUrl: '/delivery',
        transaction,
      });

      return created;
    });

    return sendSuccess(res, assignment, 'Order assigned to delivery partner', 201);
  } catch (err) {
    return next(err);
  }
};

const respondToAssignment = async (req, res, next) => {
  try {
    const partner = await DeliveryPartner.findOne({ where: { user_id: req.user.id } });
    const assignment = await DeliveryAssignment.findOne({
      where: { id: req.params.id, delivery_partner_id: partner?.id },
      include: [{ model: Order, as: 'order' }],
    });
    if (!assignment) return next(new AppError('Assignment not found', 404, 'NOT_FOUND'));
    if (assignment.status !== 'assigned') {
      return next(new AppError('Assignment already responded to', 400, 'INVALID_STATE'));
    }

    const { action, rejection_reason = null } = req.body;
    const nextStatus = action === 'accept' ? 'accepted' : 'rejected';

    await assignment.update({
      status: nextStatus,
      ...(action === 'accept' ? { accepted_at: new Date() } : { rejection_reason }),
    });
    await DeliveryStatusHistory.create({
      delivery_assignment_id: assignment.id,
      status: nextStatus,
      note: rejection_reason || `Partner ${action}ed assignment`,
      changed_by: req.user.id,
    });

    return sendSuccess(res, assignment, `Assignment ${nextStatus}`);
  } catch (err) {
    return next(err);
  }
};

const confirmPickup = async (req, res, next) => {
  try {
    const partner = await DeliveryPartner.findOne({ where: { user_id: req.user.id } });
    const assignment = await DeliveryAssignment.findOne({
      where: { id: req.params.id, delivery_partner_id: partner?.id },
      include: [{ model: Order, as: 'order' }],
    });
    if (!assignment) return next(new AppError('Assignment not found', 404, 'NOT_FOUND'));

    await sequelize.transaction(async (transaction) => {
      await assignment.update({ status: 'picked_up', picked_up_at: new Date() }, { transaction });
      await partner.update({ current_availability: 'on_delivery' }, { transaction });
      await DeliveryStatusHistory.create(
        { delivery_assignment_id: assignment.id, status: 'picked_up', note: 'Parcel picked up from warehouse', changed_by: req.user.id },
        { transaction }
      );
      await assignment.order.update({ status: 'ready_for_pickup' }, { transaction });
    });

    return sendSuccess(res, assignment, 'Parcel pickup confirmed');
  } catch (err) {
    return next(err);
  }
};

const startDelivery = async (req, res, next) => {
  try {
    const partner = await DeliveryPartner.findOne({ where: { user_id: req.user.id } });
    const assignment = await DeliveryAssignment.findOne({
      where: { id: req.params.id, delivery_partner_id: partner?.id },
      include: [{ model: Order, as: 'order' }],
    });
    if (!assignment) return next(new AppError('Assignment not found', 404, 'NOT_FOUND'));

    await sequelize.transaction(async (transaction) => {
      await assignment.update({ status: 'out_for_delivery', out_for_delivery_at: new Date() }, { transaction });
      await partner.update({ is_online: true, current_availability: 'on_delivery' }, { transaction });
      await assignment.order.update({ status: 'shipped' }, { transaction });
      await OrderStatusHistory.create(
        {
          order_id: assignment.order.id,
          from_status: assignment.order.status,
          to_status: 'shipped',
          note: 'Out for delivery with Taantira partner',
          changed_by: req.user.id,
        },
        { transaction }
      );
      await createNotification({
        userId: assignment.order.user_id,
        title: `Order ${assignment.order.order_number} Out for Delivery`,
        message: 'Your parcel is out for delivery. View live map and secure Delivery OTP on your order tracking page.',
        category: 'delivery',
        linkUrl: `/account/orders/${assignment.order.id}`,
        transaction,
      });
    });

    return sendSuccess(res, assignment, 'Delivery started; live GPS tracking active');
  } catch (err) {
    return next(err);
  }
};

const updatePartnerLocation = async (req, res, next) => {
  try {
    const partner = await DeliveryPartner.findOne({ where: { user_id: req.user.id } });
    if (!partner || partner.approval_status !== 'approved') {
      return next(new AppError('Approved delivery partner required', 403, 'FORBIDDEN'));
    }

    const {
      delivery_assignment_id = null,
      latitude,
      longitude,
      accuracy_meters = null,
      speed_mps = null,
      heading = null,
    } = req.body;

    const now = new Date();
    const [current] = await DeliveryPartnerCurrentLocation.findOrCreate({
      where: { delivery_partner_id: partner.id },
      defaults: {
        delivery_partner_id: partner.id,
        delivery_assignment_id,
        latitude,
        longitude,
        accuracy_meters,
        speed_mps,
        heading,
        recorded_at: now,
      },
    });

    await current.update({
      delivery_assignment_id,
      latitude,
      longitude,
      accuracy_meters,
      speed_mps,
      heading,
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

    const io = getSocketServer();
    if (io) {
      const payload = {
        delivery_partner_id: partner.id,
        delivery_assignment_id,
        latitude: Number(latitude),
        longitude: Number(longitude),
        accuracy_meters,
        recorded_at: now.toISOString(),
      };
      io.to('admin:tracking').emit('tracking:location', payload);

      if (delivery_assignment_id) {
        const assignment = await DeliveryAssignment.findByPk(delivery_assignment_id);
        if (assignment) {
          io.to(`order:${assignment.order_id}`).emit('tracking:location', {
            ...payload,
            order_id: assignment.order_id,
          });
        }
      }
    }

    return sendSuccess(res, current, 'Location updated');
  } catch (err) {
    return next(err);
  }
};

const completeDeliveryWithOtp = async (req, res, next) => {
  try {
    const partner = await DeliveryPartner.findOne({ where: { user_id: req.user.id } });
    const assignment = await DeliveryAssignment.findOne({
      where: { id: req.params.id, delivery_partner_id: partner?.id },
      include: [{ model: Order, as: 'order', include: [{ model: OrderAddress, as: 'shippingAddress' }] }],
    });
    if (!assignment || !assignment.order) return next(new AppError('Assignment not found', 404, 'NOT_FOUND'));

    const order = assignment.order;
    if (order.delivery_otp_attempts >= 5) {
      return next(new AppError('Maximum OTP attempts exceeded. Contact Delivery Manager.', 429, 'OTP_LOCKED'));
    }

    if (!order.delivery_otp_code || order.delivery_otp_code !== req.body.otp) {
      await order.increment('delivery_otp_attempts', { by: 1 });
      return next(new AppError('Invalid customer delivery OTP', 400, 'INVALID_OTP'));
    }

    await sequelize.transaction(async (transaction) => {
      const now = new Date();
      await assignment.update({ status: 'delivered', delivered_at: now }, { transaction });
      await partner.update({ current_availability: 'available' }, { transaction });
      await order.update(
        {
          status: 'delivered',
          otp_verified_at: now,
          delivered_at: now,
          ...(order.payment_method === 'cod' && req.body.cod_collected ? { payment_status: 'paid' } : {}),
        },
        { transaction }
      );

      if (order.payment_method === 'cod' && req.body.cod_collected) {
        const payment = await Payment.findOne({ where: { order_id: order.id }, transaction });
        if (payment) {
          await payment.update({ status: 'paid', verified_at: now, verification_note: 'COD collected by partner' }, { transaction });
          await PaymentTransaction.create(
            {
              payment_id: payment.id,
              order_id: order.id,
              transaction_type: 'cod_collected',
              amount: payment.amount,
              reference_number: `COD-${order.order_number}`,
              status: 'paid',
            },
            { transaction }
          );
        }
      }

      await DeliveryProof.create(
        {
          delivery_assignment_id: assignment.id,
          order_id: order.id,
          otp_verified: true,
          recipient_name: req.body.recipient_name || order.shippingAddress?.recipient_name,
          note: req.body.note || 'Delivered with verified customer OTP',
          delivered_latitude: req.body.delivered_latitude || null,
          delivered_longitude: req.body.delivered_longitude || null,
          captured_at: now,
        },
        { transaction }
      );

      const zonePin = order.shippingAddress?.pincode
        ? await DeliveryZonePincode.findOne({
            where: { pincode: order.shippingAddress.pincode },
            include: [{ model: DeliveryZone, as: 'zone' }],
            transaction,
          })
        : null;
      const payout = Number(zonePin?.zone?.per_order_payout ?? 75);

      await DeliveryEarning.create(
        {
          delivery_partner_id: partner.id,
          delivery_assignment_id: assignment.id,
          order_id: order.id,
          amount: payout,
          status: 'pending',
          earned_at: now,
        },
        { transaction }
      );

      await OrderStatusHistory.create(
        {
          order_id: order.id,
          from_status: 'shipped',
          to_status: 'delivered',
          note: 'OTP verified & delivered by partner',
          changed_by: req.user.id,
        },
        { transaction }
      );

      await createNotification({
        userId: order.user_id,
        title: `Order ${order.order_number} Delivered`,
        message: 'Your Taantira order has been delivered successfully. Thank you for shopping with us!',
        category: 'delivery',
        linkUrl: `/account/orders/${order.id}`,
        transaction,
      });
    });

    return sendSuccess(res, { order_id: order.id, status: 'delivered' }, 'Delivery completed and OTP verified');
  } catch (err) {
    return next(err);
  }
};

const getOrderTracking = async (req, res, next) => {
  try {
    const order = await Order.findByPk(req.params.orderId, {
      attributes: ['id', 'order_number', 'user_id', 'status', 'delivery_mode', 'delivered_at'],
      include: [
        { model: OrderAddress, as: 'shippingAddress' },
        {
          model: DeliveryAssignment,
          as: 'deliveryAssignments',
          include: [
            {
              model: DeliveryPartner,
              as: 'partner',
              include: [
                { model: User, as: 'user', attributes: ['id', 'full_name', 'phone'] },
                { model: DeliveryPartnerCurrentLocation, as: 'currentLocation' },
                { model: DeliveryVehicle, as: 'vehicles' },
              ],
            },
            { model: DeliveryProof, as: 'proof' },
          ],
        },
        {
          model: CourierShipment,
          as: 'courierShipment',
          include: [{ model: CourierTrackingEvent, as: 'events' }],
        },
      ],
    });

    if (!order) return next(new AppError('Order not found', 404, 'NOT_FOUND'));

    const owner = Number(order.user_id) === Number(req.user.id);
    const activePartner = order.deliveryAssignments?.find(
      (a) => Number(a.partner?.user_id) === Number(req.user.id)
    );
    if (!owner && !activePartner && !isStaff(req.user)) {
      return next(new AppError('Not authorized to track this order', 403, 'FORBIDDEN'));
    }

    const latestAssignment = order.deliveryAssignments?.[order.deliveryAssignments.length - 1] || null;
    const loc = latestAssignment?.partner?.currentLocation || null;
    const ageSeconds = loc ? Math.floor((Date.now() - new Date(loc.recorded_at).getTime()) / 1000) : null;

    let routeInfo = { configured: false, route: null };
    if (
      loc &&
      order.shippingAddress?.latitude &&
      order.shippingAddress?.longitude
    ) {
      routeInfo = await getRouteBetweenPoints({
        fromLat: loc.latitude,
        fromLng: loc.longitude,
        toLat: order.shippingAddress.latitude,
        toLng: order.shippingAddress.longitude,
      });
    }

    return sendSuccess(res, {
      order_id: order.id,
      order_number: order.order_number,
      status: order.status,
      delivery_mode: order.delivery_mode,
      shipping_address: order.shippingAddress,
      assignment: latestAssignment,
      live_location: loc
        ? {
            latitude: Number(loc.latitude),
            longitude: Number(loc.longitude),
            accuracy_meters: loc.accuracy_meters,
            recorded_at: loc.recorded_at,
            age_seconds: ageSeconds,
            is_stale: ageSeconds !== null && ageSeconds > STALE_LOCATION_THRESHOLD_SECONDS,
          }
        : null,
      osrm_route: routeInfo,
      courier_shipment: order.courierShipment || null,
    });
  } catch (err) {
    return next(err);
  }
};

const getActiveFleetTrackingAdmin = async (req, res, next) => {
  try {
    const activePartners = await DeliveryPartner.findAll({
      where: { approval_status: 'approved' },
      include: [
        { model: User, as: 'user', attributes: ['id', 'full_name', 'phone'] },
        { model: DeliveryPartnerCurrentLocation, as: 'currentLocation' },
        { model: DeliveryVehicle, as: 'vehicles' },
        {
          model: DeliveryAssignment,
          as: 'assignments',
          where: { status: { [Op.in]: ['accepted', 'picked_up', 'out_for_delivery'] } },
          required: false,
          include: [{ model: Order, as: 'order', attributes: ['id', 'order_number', 'status'] }],
        },
      ],
    });

    const formatted = activePartners.map((p) => {
      const json = p.toJSON();
      const loc = json.currentLocation;
      const ageSeconds = loc ? Math.floor((Date.now() - new Date(loc.recorded_at).getTime()) / 1000) : null;
      return {
        ...json,
        is_stale: ageSeconds !== null && ageSeconds > STALE_LOCATION_THRESHOLD_SECONDS,
        age_seconds: ageSeconds,
      };
    });

    return sendSuccess(res, formatted);
  } catch (err) {
    return next(err);
  }
};

// Zones & PIN codes
const listZones = async (req, res, next) => {
  try {
    const zones = await DeliveryZone.findAll({
      include: [{ model: DeliveryZonePincode, as: 'pincodes' }],
      order: [['name', 'ASC']],
    });
    return sendSuccess(res, zones);
  } catch (err) {
    return next(err);
  }
};

const createZone = async (req, res, next) => {
  try {
    const { pincodes, cod_available = true, ...zoneFields } = req.body;
    const zone = await sequelize.transaction(async (transaction) => {
      const created = await DeliveryZone.create(zoneFields, { transaction });
      await DeliveryZonePincode.bulkCreate(
        pincodes.map((pincode) => ({
          delivery_zone_id: created.id,
          pincode,
          is_serviceable: true,
          cod_available,
        })),
        { transaction }
      );
      return created;
    });
    return sendSuccess(res, zone, 'Delivery zone created', 201);
  } catch (err) {
    return next(err);
  }
};

// Third-Party Manual Courier Shipping
const bookCourierShipment = async (req, res, next) => {
  try {
    const { order_id, courier_company, awb_number, tracking_url, pickup_date, estimated_delivery_date, notes } = req.body;
    const order = await Order.findByPk(order_id);
    if (!order) return next(new AppError('Order not found', 404, 'NOT_FOUND'));

    const shipment = await sequelize.transaction(async (transaction) => {
      await order.update({ delivery_mode: 'third_party_courier', status: 'shipped' }, { transaction });
      const [record, created] = await CourierShipment.findOrCreate({
        where: { order_id },
        defaults: {
          order_id,
          courier_company,
          awb_number,
          tracking_url: tracking_url || null,
          pickup_date: pickup_date || null,
          estimated_delivery_date: estimated_delivery_date || null,
          shipment_status: 'booked',
          notes: notes || null,
          created_by: req.user.id,
        },
        transaction,
      });
      if (!created) {
        await record.update(
          { courier_company, awb_number, tracking_url, pickup_date, estimated_delivery_date, notes },
          { transaction }
        );
      }

      await CourierTrackingEvent.create(
        {
          courier_shipment_id: record.id,
          status: 'Booked & Dispatched',
          description: `Booked via ${courier_company} (AWB: ${awb_number})`,
          updated_by: req.user.id,
        },
        { transaction }
      );

      await createNotification({
        userId: order.user_id,
        title: `Order ${order.order_number} Shipped via Courier`,
        message: `Courier: ${courier_company} | AWB: ${awb_number}`,
        category: 'delivery',
        linkUrl: `/account/orders/${order.id}`,
        transaction,
      });

      return record;
    });

    return sendSuccess(res, shipment, 'Courier shipment recorded', 201);
  } catch (err) {
    return next(err);
  }
};

const addCourierEvent = async (req, res, next) => {
  try {
    const shipment = await CourierShipment.findByPk(req.params.shipmentId, {
      include: [{ model: Order, as: 'order' }],
    });
    if (!shipment) return next(new AppError('Courier shipment not found', 404, 'NOT_FOUND'));

    const event = await sequelize.transaction(async (transaction) => {
      const created = await CourierTrackingEvent.create(
        {
          courier_shipment_id: shipment.id,
          status: req.body.status,
          location: req.body.location || null,
          description: req.body.description,
          updated_by: req.user.id,
        },
        { transaction }
      );
      await shipment.update({ shipment_status: req.body.status }, { transaction });
      if (req.body.customer_order_status) {
        await shipment.order.update(
          {
            status: req.body.customer_order_status,
            ...(req.body.customer_order_status === 'delivered' ? { delivered_at: new Date() } : {}),
          },
          { transaction }
        );
      }
      return created;
    });

    return sendSuccess(res, event, 'Courier milestone added', 201);
  } catch (err) {
    return next(err);
  }
};

const settlePartnerEarnings = async (req, res, next) => {
  try {
    const { delivery_partner_id, reference_number, period_start, period_end } = req.body;
    const pending = await DeliveryEarning.findAll({
      where: { delivery_partner_id, status: 'pending' },
    });
    if (pending.length === 0) {
      return next(new AppError('No pending earnings to settle for this partner', 400, 'NO_PENDING_EARNINGS'));
    }
    const total = pending.reduce((sum, e) => sum + Number(e.amount) + Number(e.bonus_amount), 0);

    const settlement = await sequelize.transaction(async (transaction) => {
      const created = await DeliverySettlement.create(
        {
          delivery_partner_id,
          total_amount: total,
          reference_number,
          status: 'paid',
          period_start,
          period_end,
          paid_at: new Date(),
          processed_by: req.user.id,
        },
        { transaction }
      );
      await DeliveryEarning.update(
        { status: 'settled', settlement_id: created.id },
        { where: { delivery_partner_id, status: 'pending' }, transaction }
      );
      return created;
    });

    return sendSuccess(res, settlement, 'Partner earnings settled', 201);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  registerPartner,
  listPartnersAdmin,
  verifyPartnerAdmin,
  getPartnerDashboard,
  toggleAvailability,
  assignOrderToPartner,
  respondToAssignment,
  confirmPickup,
  startDelivery,
  updatePartnerLocation,
  completeDeliveryOtp: completeDeliveryWithOtp,
  getOrderTracking,
  getActiveFleetTrackingAdmin,
  listZones,
  createZone,
  bookCourierShipment,
  addCourierEvent,
  settlePartnerEarnings,
};
