const {
  sequelize,
  Order,
  OrderItem,
  OrderAddress,
  OrderStatusHistory,
  OrderCancellation,
  Payment,
  PaymentTransaction,
  PaymentReconciliation,
  Refund,
  ReturnRequest,
  ReturnItem,
  ExchangeRequest,
  ReturnPickup,
  DeliveryAssignment,
  DeliveryPartner,
  CourierShipment,
  CourierTrackingEvent,
  ProductVariant,
  StockMovement,
  Warehouse,
  WarehouseStock,
  User,
} = require('../models');
const { ADMIN_ROLES } = require('../config/constants');
const { placeOrderFromCart } = require('../services/checkout.service');
const { calculateShippingForPincode, getPublicSettingsMap } = require('../services/pricing.service');
const { createNotification, getSocketServer } = require('../services/notification.service');
const { recordAuditLog } = require('../middleware/audit');
const { sendSuccess } = require('../utils/response');
const { AppError } = require('../utils/errors');

const isAdmin = (user) => (user?.roles || []).some((r) => ADMIN_ROLES.includes(r));

const checkPincode = async (req, res, next) => {
  try {
    const pincode = String(req.params.pincode || req.query.pincode || '').trim();
    if (!/^\d{6}$/.test(pincode)) {
      return next(new AppError('Enter a valid 6-digit PIN code', 400, 'INVALID_PINCODE'));
    }
    const info = await calculateShippingForPincode({ pincode, subtotalAfterDiscount: 0 });
    return sendSuccess(res, {
      pincode,
      serviceable: info.isServiceable,
      cod_available: info.codAvailable,
      own_partner_available: Boolean(info.zone),
      zone_name: info.zone?.name || 'Pan-India Courier Zone',
      estimated_hours: info.zone?.estimated_hours || 96,
      shipping_fee: info.shippingFee,
    });
  } catch (err) {
    return next(err);
  }
};

const checkoutConfig = async (req, res, next) => {
  try {
    const settings = await getPublicSettingsMap();
    return sendSuccess(res, {
      upi_vpa: settings.upiVpa,
      upi_payee_name: settings.upiPayeeName,
      free_shipping_threshold: settings.freeShippingThreshold,
      default_shipping_fee: settings.defaultShippingFee,
    });
  } catch (err) {
    return next(err);
  }
};

const checkout = async (req, res, next) => {
  try {
    const result = await placeOrderFromCart({
      userId: req.user.id,
      payload: req.body,
    });
    return sendSuccess(res, result, 'Order placed successfully', 201);
  } catch (err) {
    return next(err);
  }
};

const listMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.findAll({
      where: { user_id: req.user.id },
      attributes: { exclude: ['delivery_otp_code'] },
      include: [
        { model: OrderItem, as: 'items' },
        { model: OrderAddress, as: 'shippingAddress' },
        { model: Payment, as: 'payments' },
        { model: DeliveryAssignment, as: 'deliveryAssignments' },
        { model: CourierShipment, as: 'courierShipment' },
      ],
      order: [['placed_at', 'DESC']],
    });
    return sendSuccess(res, orders);
  } catch (err) {
    return next(err);
  }
};

const getOrderDetail = async (req, res, next) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        { model: User, as: 'customer', attributes: ['id', 'full_name', 'email', 'phone'] },
        { model: OrderItem, as: 'items' },
        { model: OrderAddress, as: 'shippingAddress' },
        { model: OrderStatusHistory, as: 'statusHistory' },
        { model: OrderCancellation, as: 'cancellation' },
        { model: Payment, as: 'payments', include: [{ model: PaymentTransaction, as: 'transactions' }] },
        { model: Refund, as: 'refunds' },
        { model: ReturnRequest, as: 'returnRequests', include: [{ model: ReturnItem, as: 'items' }] },
        {
          model: DeliveryAssignment,
          as: 'deliveryAssignments',
          include: [
            {
              model: DeliveryPartner,
              as: 'partner',
              include: [{ model: User, as: 'user', attributes: ['id', 'full_name', 'phone'] }],
            },
          ],
        },
        {
          model: CourierShipment,
          as: 'courierShipment',
          include: [{ model: CourierTrackingEvent, as: 'events' }],
        },
      ],
    });

    if (!order) return next(new AppError('Order not found', 404, 'ORDER_NOT_FOUND'));

    const owner = Number(order.user_id) === Number(req.user.id);
    const staff = isAdmin(req.user);
    if (!owner && !staff) {
      return next(new AppError('Access denied for this order', 403, 'FORBIDDEN'));
    }

    const orderJson = order.toJSON();
    // Delivery OTP is displayed securely ONLY to the authenticated order owner!
    if (!owner) {
      delete orderJson.delivery_otp_code;
    }
    return sendSuccess(res, orderJson);
  } catch (err) {
    return next(err);
  }
};

const cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [{ model: OrderItem, as: 'items' }],
    });
    if (!order) return next(new AppError('Order not found', 404, 'NOT_FOUND'));

    const owner = Number(order.user_id) === Number(req.user.id);
    if (!owner && !isAdmin(req.user)) {
      return next(new AppError('Access denied', 403, 'FORBIDDEN'));
    }

    if (['shipped', 'delivered', 'cancelled', 'returned'].includes(order.status)) {
      return next(new AppError(`Order in ${order.status} status cannot be cancelled directly`, 400, 'CANNOT_CANCEL'));
    }

    await sequelize.transaction(async (transaction) => {
      const prevStatus = order.status;
      await order.update(
        {
          status: 'cancelled',
          cancelled_at: new Date(),
          ...(order.payment_status === 'pending' ? { payment_status: 'cancelled' } : {}),
        },
        { transaction }
      );

      await OrderCancellation.create(
        {
          order_id: order.id,
          requested_by: req.user.id,
          reason: req.body.reason,
          details: req.body.details || null,
          status: 'approved',
          reviewed_by: req.user.id,
          reviewed_at: new Date(),
        },
        { transaction }
      );

      await OrderStatusHistory.create(
        {
          order_id: order.id,
          from_status: prevStatus,
          to_status: 'cancelled',
          note: req.body.reason,
          changed_by: req.user.id,
        },
        { transaction }
      );

      const defaultWarehouse = await Warehouse.findOne({ where: { is_default: true }, transaction });
      for (const item of order.items || []) {
        await ProductVariant.increment('stock_qty', { by: item.quantity, where: { id: item.variant_id }, transaction });
        if (defaultWarehouse) {
          await WarehouseStock.increment('quantity_on_hand', {
            by: item.quantity,
            where: { warehouse_id: defaultWarehouse.id, variant_id: item.variant_id },
            transaction,
          });
          await StockMovement.create(
            {
              warehouse_id: defaultWarehouse.id,
              variant_id: item.variant_id,
              movement_type: 'release',
              quantity_delta: item.quantity,
              reference_type: 'order_cancellation',
              reference_id: order.id,
              notes: `Stock restored on cancellation (${order.order_number})`,
              performed_by: req.user.id,
            },
            { transaction }
          );
        }
      }

      await createNotification({
        userId: order.user_id,
        title: `Order ${order.order_number} Cancelled`,
        message: `Your order has been cancelled. Reason: ${req.body.reason}`,
        category: 'order',
        linkUrl: `/account/orders/${order.id}`,
        transaction,
      });
    });

    return sendSuccess(res, null, 'Order cancelled and inventory restored');
  } catch (err) {
    return next(err);
  }
};

const submitUpiUtr = async (req, res, next) => {
  try {
    const order = await Order.findByPk(req.params.orderId);
    if (!order) return next(new AppError('Order not found', 404, 'NOT_FOUND'));
    if (Number(order.user_id) !== Number(req.user.id)) {
      return next(new AppError('Access denied', 403, 'FORBIDDEN'));
    }
    if (order.payment_method !== 'manual_upi') {
      return next(new AppError('Order does not use manual UPI payment', 400, 'INVALID_PAYMENT_METHOD'));
    }

    const payment = await Payment.findOne({ where: { order_id: order.id } });
    if (!payment) return next(new AppError('Payment record missing', 404, 'NOT_FOUND'));
    if (payment.status === 'paid') {
      return next(new AppError('Payment is already verified', 400, 'ALREADY_VERIFIED'));
    }

    await sequelize.transaction(async (transaction) => {
      // Never mark paid on customer submission! Always awaiting_verification until finance confirms.
      await payment.update(
        {
          customer_utr: req.body.utr_number,
          status: 'awaiting_verification',
          submitted_at: new Date(),
        },
        { transaction }
      );
      await order.update({ payment_status: 'awaiting_verification' }, { transaction });
      await PaymentTransaction.create(
        {
          payment_id: payment.id,
          order_id: order.id,
          transaction_type: 'utr_submitted',
          amount: payment.amount,
          reference_number: req.body.utr_number,
          status: 'awaiting_verification',
        },
        { transaction }
      );
    });

    return sendSuccess(res, payment, 'UTR submitted and awaiting admin verification');
  } catch (err) {
    return next(err);
  }
};

const verifyPaymentAdmin = async (req, res, next) => {
  try {
    const payment = await Payment.findByPk(req.params.id, { include: [{ model: Order, as: 'order' }] });
    if (!payment) return next(new AppError('Payment record not found', 404, 'NOT_FOUND'));

    const { decision, verification_note = null, received_amount } = req.body;

    await sequelize.transaction(async (transaction) => {
      await payment.update(
        {
          status: decision,
          verified_by: req.user.id,
          verified_at: new Date(),
          verification_note,
        },
        { transaction }
      );

      await payment.order.update({ payment_status: decision }, { transaction });

      await PaymentTransaction.create(
        {
          payment_id: payment.id,
          order_id: payment.order_id,
          transaction_type: decision === 'paid' ? 'verified' : 'failed',
          amount: payment.amount,
          reference_number: payment.customer_utr,
          status: decision,
        },
        { transaction }
      );

      const expected = Number(payment.amount);
      const received = decision === 'paid' ? Number(received_amount ?? expected) : 0;
      const discrepancy = Math.round((expected - received) * 100) / 100;

      await PaymentReconciliation.create(
        {
          payment_id: payment.id,
          order_id: payment.order_id,
          expected_amount: expected,
          received_amount: received,
          discrepancy_amount: discrepancy,
          status: discrepancy === 0 ? 'matched' : 'discrepancy',
          reconciled_by: req.user.id,
          notes: verification_note,
        },
        { transaction }
      );

      await createNotification({
        userId: payment.user_id,
        title: decision === 'paid' ? 'UPI Payment Verified' : 'UPI Payment Verification Failed',
        message:
          decision === 'paid'
            ? `Your payment for order ${payment.order.order_number} has been verified.`
            : `Payment verification failed for ${payment.order.order_number}. Note: ${verification_note || 'Please re-submit valid UTR.'}`,
        category: 'payment',
        linkUrl: `/account/orders/${payment.order_id}`,
        transaction,
      });

      await recordAuditLog({
        actorId: req.user.id,
        action: 'PAYMENT_VERIFIED',
        entityType: 'payment',
        entityId: payment.id,
        newValues: { decision, verification_note, received },
        ipAddress: req.ip,
        transaction,
      });
    });

    return sendSuccess(res, payment, `Payment marked as ${decision}`);
  } catch (err) {
    return next(err);
  }
};

const listPayments = async (req, res, next) => {
  try {
    const where = isAdmin(req.user) ? {} : { user_id: req.user.id };
    const payments = await Payment.findAll({
      where,
      include: [
        { model: Order, as: 'order', attributes: ['id', 'order_number', 'status', 'total_amount'] },
        { model: PaymentTransaction, as: 'transactions' },
      ],
      order: [['created_at', 'DESC']],
    });
    return sendSuccess(res, payments);
  } catch (err) {
    return next(err);
  }
};

const listOrdersAdmin = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.payment_status) where.payment_status = req.query.payment_status;

    const orders = await Order.findAll({
      where,
      attributes: { exclude: ['delivery_otp_code'] },
      include: [
        { model: User, as: 'customer', attributes: ['id', 'full_name', 'email', 'phone'] },
        { model: OrderItem, as: 'items' },
        { model: OrderAddress, as: 'shippingAddress' },
        { model: Payment, as: 'payments' },
        {
          model: DeliveryAssignment,
          as: 'deliveryAssignments',
          include: [{ model: DeliveryPartner, as: 'partner', include: [{ model: User, as: 'user', attributes: ['full_name'] }] }],
        },
        { model: CourierShipment, as: 'courierShipment' },
      ],
      order: [['placed_at', 'DESC']],
    });
    return sendSuccess(res, orders);
  } catch (err) {
    return next(err);
  }
};

const updateOrderStatusAdmin = async (req, res, next) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) return next(new AppError('Order not found', 404, 'NOT_FOUND'));

    const prevStatus = order.status;
    await sequelize.transaction(async (transaction) => {
      await order.update(
        {
          status: req.body.status,
          ...(req.body.status === 'delivered' ? { delivered_at: new Date() } : {}),
        },
        { transaction }
      );
      await OrderStatusHistory.create(
        {
          order_id: order.id,
          from_status: prevStatus,
          to_status: req.body.status,
          note: req.body.note || `Updated by staff`,
          changed_by: req.user.id,
        },
        { transaction }
      );

      await createNotification({
        userId: order.user_id,
        title: `Order ${order.order_number} Status Updated`,
        message: `Your order status is now ${req.body.status.replace(/_/g, ' ')}.`,
        category: 'order',
        linkUrl: `/account/orders/${order.id}`,
        transaction,
      });

      await recordAuditLog({
        actorId: req.user.id,
        action: 'ORDER_STATUS_UPDATED',
        entityType: 'order',
        entityId: order.id,
        oldValues: { status: prevStatus },
        newValues: { status: req.body.status, note: req.body.note },
        ipAddress: req.ip,
        transaction,
      });
    });

    const io = getSocketServer();
    if (io) {
      io.to(`order:${order.id}`).emit('order:status_updated', {
        order_id: order.id,
        status: req.body.status,
      });
    }

    return sendSuccess(res, order, 'Order status updated');
  } catch (err) {
    return next(err);
  }
};

const listRefunds = async (req, res, next) => {
  try {
    const where = isAdmin(req.user) ? {} : { user_id: req.user.id };
    const refunds = await Refund.findAll({
      where,
      include: [{ model: Order, as: 'order', attributes: ['id', 'order_number', 'total_amount'] }],
      order: [['created_at', 'DESC']],
    });
    return sendSuccess(res, refunds);
  } catch (err) {
    return next(err);
  }
};

const processRefund = async (req, res, next) => {
  try {
    const { order_id, amount, refund_type, reason, reference_number } = req.body;
    const order = await Order.findByPk(order_id);
    if (!order) return next(new AppError('Order not found', 404, 'NOT_FOUND'));

    const payment = await Payment.findOne({ where: { order_id: order.id } });
    if (!payment) return next(new AppError('Payment record not found', 404, 'NOT_FOUND'));

    if (Number(amount) > Number(payment.amount)) {
      return next(new AppError('Refund amount cannot exceed paid order amount', 400, 'REFUND_EXCEEDS_PAYMENT'));
    }

    const refund = await sequelize.transaction(async (transaction) => {
      const created = await Refund.create(
        {
          order_id: order.id,
          payment_id: payment.id,
          user_id: order.user_id,
          amount,
          refund_type,
          reason,
          status: 'processed',
          reference_number: reference_number || `REF-${Date.now()}`,
          processed_by: req.user.id,
          processed_at: new Date(),
        },
        { transaction }
      );

      const nextPayStatus = refund_type === 'partial' && Number(amount) < Number(payment.amount)
        ? 'partially_refunded'
        : 'refunded';
      await payment.update({ status: nextPayStatus }, { transaction });
      await order.update({ payment_status: nextPayStatus }, { transaction });
      await PaymentTransaction.create(
        {
          payment_id: payment.id,
          order_id: order.id,
          transaction_type: 'refund',
          amount,
          reference_number: created.reference_number,
          status: 'processed',
        },
        { transaction }
      );

      await createNotification({
        userId: order.user_id,
        title: `Refund Processed for ${order.order_number}`,
        message: `A ${refund_type} refund of Rs ${Number(amount).toFixed(2)} has been processed.`,
        category: 'refund',
        linkUrl: `/account/orders/${order.id}`,
        transaction,
      });

      await recordAuditLog({
        actorId: req.user.id,
        action: 'REFUND_PROCESSED',
        entityType: 'refund',
        entityId: created.id,
        newValues: { order_id, amount, refund_type, reason },
        ipAddress: req.ip,
        transaction,
      });
      return created;
    });

    return sendSuccess(res, refund, 'Refund processed', 201);
  } catch (err) {
    return next(err);
  }
};

const listReturns = async (req, res, next) => {
  try {
    const where = isAdmin(req.user) ? {} : { user_id: req.user.id };
    const returns = await ReturnRequest.findAll({
      where,
      include: [
        { model: Order, as: 'order', attributes: ['id', 'order_number', 'total_amount'] },
        { model: User, as: 'customer', attributes: ['id', 'full_name', 'email'] },
        { model: ReturnItem, as: 'items', include: [{ model: OrderItem, as: 'orderItem' }] },
        { model: ExchangeRequest, as: 'exchangeRequest' },
        { model: ReturnPickup, as: 'pickup' },
      ],
      order: [['created_at', 'DESC']],
    });
    return sendSuccess(res, returns);
  } catch (err) {
    return next(err);
  }
};

const createReturnRequest = async (req, res, next) => {
  try {
    const { order_id, request_type, reason, details, items, exchange_variant_id } = req.body;
    const order = await Order.findByPk(order_id, { include: [{ model: OrderItem, as: 'items' }] });
    if (!order || Number(order.user_id) !== Number(req.user.id)) {
      return next(new AppError('Order not found or access denied', 404, 'NOT_FOUND'));
    }
    if (order.status !== 'delivered') {
      return next(new AppError('Returns/exchanges can only be requested for delivered orders', 400, 'ORDER_NOT_DELIVERED'));
    }

    const created = await sequelize.transaction(async (transaction) => {
      const reqRecord = await ReturnRequest.create(
        {
          order_id,
          user_id: req.user.id,
          request_type,
          reason,
          details: details || null,
          status: 'requested',
        },
        { transaction }
      );

      await ReturnItem.bulkCreate(
        items.map((item) => ({
          return_request_id: reqRecord.id,
          order_item_id: item.order_item_id,
          quantity: item.quantity,
          condition_note: item.condition_note || null,
        })),
        { transaction }
      );

      if (request_type === 'exchange' && exchange_variant_id) {
        const firstOrderItem = order.items.find((oi) => Number(oi.id) === Number(items[0].order_item_id));
        if (firstOrderItem) {
          await ExchangeRequest.create(
            {
              return_request_id: reqRecord.id,
              order_id,
              original_variant_id: firstOrderItem.variant_id,
              requested_variant_id: exchange_variant_id,
              status: 'requested',
            },
            { transaction }
          );
        }
      }

      return reqRecord;
    });

    return sendSuccess(res, created, `${request_type} request submitted`, 201);
  } catch (err) {
    return next(err);
  }
};

const reviewReturnAdmin = async (req, res, next) => {
  try {
    const returnReq = await ReturnRequest.findByPk(req.params.id, {
      include: [{ model: Order, as: 'order' }],
    });
    if (!returnReq) return next(new AppError('Return request not found', 404, 'NOT_FOUND'));

    await sequelize.transaction(async (transaction) => {
      await returnReq.update(
        {
          status: req.body.status,
          admin_notes: req.body.admin_notes || null,
          approved_by: req.user.id,
          approved_at: new Date(),
        },
        { transaction }
      );

      if (req.body.status === 'pickup_scheduled') {
        await ReturnPickup.findOrCreate({
          where: { return_request_id: returnReq.id },
          defaults: {
            return_request_id: returnReq.id,
            delivery_partner_id: req.body.delivery_partner_id || null,
            pickup_status: req.body.delivery_partner_id ? 'assigned' : 'pending',
            scheduled_date: req.body.scheduled_date || null,
          },
          transaction,
        });
      }

      if (req.body.status === 'completed') {
        await returnReq.order.update({ status: 'returned' }, { transaction });
      }

      await createNotification({
        userId: returnReq.user_id,
        title: `Return Request ${req.body.status.replace(/_/g, ' ')}`,
        message: `Your ${returnReq.request_type} request for ${returnReq.order.order_number} is now ${req.body.status.replace(/_/g, ' ')}.`,
        category: 'return',
        linkUrl: '/account/returns',
        transaction,
      });
    });

    return sendSuccess(res, returnReq, 'Return request updated');
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  checkPincode,
  checkoutConfig,
  checkout,
  listMyOrders,
  getOrderDetail,
  cancelOrder,
  submitUpiUtr,
  verifyPaymentAdmin,
  listPayments,
  listOrdersAdmin,
  updateOrderStatusAdmin,
  listRefunds,
  processRefund,
  listReturns,
  createReturnRequest,
  reviewReturnAdmin,
};
