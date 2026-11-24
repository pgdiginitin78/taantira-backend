const crypto = require('crypto');
const {
  sequelize,
  Cart,
  CartItem,
  Product,
  ProductVariant,
  ProductImage,
  Category,
  Order,
  OrderItem,
  OrderAddress,
  OrderStatusHistory,
  Payment,
  PaymentTransaction,
  CouponUsage,
  Warehouse,
  WarehouseStock,
  StockMovement,
  StockReservation,
  CustomerProfile,
} = require('../models');
const { computeCartTotals } = require('./pricing.service');
const { createNotification } = require('./notification.service');
const { AppError } = require('../utils/errors');

const generateOrderNumber = () => {
  const year = new Date().getFullYear();
  const suffix = crypto.randomInt(100000, 999999);
  return `TAN-${year}-${suffix}`;
};

const generateDeliveryOtp = () => String(crypto.randomInt(100000, 999999));

const placeOrderFromCart = async ({ userId, payload }) => {
  const cart = await Cart.findOne({
    where: { user_id: userId, status: 'active' },
    include: [
      {
        model: CartItem,
        as: 'items',
        include: [
          {
            model: Product,
            as: 'product',
            include: [
              { model: Category, as: 'primaryCategory' },
              { model: ProductImage, as: 'images' },
            ],
          },
          { model: ProductVariant, as: 'variant' },
        ],
      },
      { association: 'coupon' },
    ],
  });

  if (!cart || !cart.items || cart.items.length === 0) {
    throw new AppError('Your shopping bag is empty', 400, 'EMPTY_CART');
  }

  const couponCode = payload.coupon_code || cart.coupon?.code || null;
  const pricing = await computeCartTotals({
    cartItems: cart.items,
    couponCode,
    userId,
    pincode: payload.shipping_address.pincode,
  });

  if (payload.payment_method === 'cod' && !pricing.codAvailable) {
    throw new AppError('Cash on Delivery is unavailable for this PIN code', 400, 'COD_UNAVAILABLE');
  }

  const orderResult = await sequelize.transaction(async (transaction) => {
    const defaultWarehouse = await Warehouse.findOne({
      where: { is_default: true, is_active: true },
      transaction,
    });

    // Lock and verify variant stock
    for (const item of cart.items) {
      const variant = await ProductVariant.findByPk(item.variant_id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!variant || !variant.is_active) {
        throw new AppError(`Variant ${item.variant_id} is no longer available`, 400, 'VARIANT_UNAVAILABLE');
      }
      const availableQty = variant.stock_qty - variant.reserved_qty;
      if (availableQty < item.quantity) {
        throw new AppError(
          `Insufficient stock for ${item.product.name} (${variant.size}). Available: ${availableQty}`,
          409,
          'INSUFFICIENT_STOCK'
        );
      }
      await variant.update({ stock_qty: variant.stock_qty - item.quantity }, { transaction });

      if (defaultWarehouse) {
        const wStock = await WarehouseStock.findOne({
          where: { warehouse_id: defaultWarehouse.id, variant_id: variant.id },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (wStock) {
          await wStock.update(
            { quantity_on_hand: Math.max(0, wStock.quantity_on_hand - item.quantity) },
            { transaction }
          );
        }
        await StockMovement.create(
          {
            warehouse_id: defaultWarehouse.id,
            variant_id: variant.id,
            movement_type: 'sale',
            quantity_delta: -item.quantity,
            reference_type: 'order',
            notes: 'Order checkout deduction',
            performed_by: userId,
          },
          { transaction }
        );
      }
    }

    const isManualUpiWithUtr = payload.payment_method === 'manual_upi' && Boolean(payload.upi_utr?.trim());
    const initialPaymentStatus = isManualUpiWithUtr ? 'awaiting_verification' : 'pending';
    const deliveryOtp = payload.delivery_mode === 'own_partner' ? generateDeliveryOtp() : null;

    const order = await Order.create(
      {
        order_number: generateOrderNumber(),
        user_id: userId,
        status: 'new',
        payment_method: payload.payment_method,
        payment_status: initialPaymentStatus,
        delivery_mode: payload.delivery_mode,
        subtotal: pricing.subtotal,
        discount_amount: pricing.discountAmount,
        tax_amount: pricing.taxAmount,
        shipping_fee: pricing.shippingFee,
        total_amount: pricing.totalAmount,
        coupon_code: pricing.coupon?.code || null,
        notes: payload.notes || null,
        delivery_otp_code: deliveryOtp,
      },
      { transaction }
    );

    await OrderItem.bulkCreate(
      pricing.lineItems.map((line) => ({
        order_id: order.id,
        product_id: line.product_id,
        variant_id: line.variant_id,
        product_name: line.product_name,
        sku: line.sku,
        size: line.size,
        color_name: line.color_name,
        quantity: line.quantity,
        unit_price: line.unit_price,
        tax_amount: line.tax_amount,
        total_price: line.total_price,
        custom_options_json: line.custom_options_json,
        image_url: line.image_url,
      })),
      { transaction }
    );

    await OrderAddress.create(
      {
        order_id: order.id,
        recipient_name: payload.shipping_address.recipient_name,
        phone: payload.shipping_address.phone,
        email: payload.customer_email,
        address_line1: payload.shipping_address.address_line1,
        address_line2: payload.shipping_address.address_line2 || null,
        landmark: payload.shipping_address.landmark || null,
        city: payload.shipping_address.city,
        state: payload.shipping_address.state,
        pincode: payload.shipping_address.pincode,
        country: payload.shipping_address.country || 'India',
        latitude: payload.shipping_address.latitude || null,
        longitude: payload.shipping_address.longitude || null,
      },
      { transaction }
    );

    await OrderStatusHistory.create(
      {
        order_id: order.id,
        from_status: null,
        to_status: 'new',
        note: 'Order placed via checkout',
        changed_by: userId,
      },
      { transaction }
    );

    const payment = await Payment.create(
      {
        order_id: order.id,
        user_id: userId,
        method: payload.payment_method,
        status: initialPaymentStatus,
        amount: pricing.totalAmount,
        currency: 'INR',
        upi_vpa: payload.payment_method === 'manual_upi' ? pricing.upiVpa : null,
        customer_utr: isManualUpiWithUtr ? payload.upi_utr.trim() : null,
        submitted_at: isManualUpiWithUtr ? new Date() : null,
      },
      { transaction }
    );

    if (isManualUpiWithUtr) {
      await PaymentTransaction.create(
        {
          payment_id: payment.id,
          order_id: order.id,
          transaction_type: 'utr_submitted',
          amount: pricing.totalAmount,
          reference_number: payload.upi_utr.trim(),
          status: 'awaiting_verification',
        },
        { transaction }
      );
    }

    if (pricing.coupon) {
      await CouponUsage.create(
        {
          coupon_id: pricing.coupon.id,
          user_id: userId,
          order_id: order.id,
          discount_applied: pricing.discountAmount,
        },
        { transaction }
      );
      await cart.coupon?.increment('used_count', { by: 1, transaction });
    }

    if (defaultWarehouse) {
      await StockReservation.bulkCreate(
        pricing.lineItems.map((line) => ({
          warehouse_id: defaultWarehouse.id,
          variant_id: line.variant_id,
          order_id: order.id,
          quantity: line.quantity,
          status: 'committed',
        })),
        { transaction }
      );
    }

    const profile = await CustomerProfile.findOne({ where: { user_id: userId }, transaction });
    if (profile) {
      const earnedPoints = Math.floor(pricing.totalAmount / 100);
      await profile.update(
        {
          total_orders: profile.total_orders + 1,
          total_spent: Number(profile.total_spent) + pricing.totalAmount,
          loyalty_points: profile.loyalty_points + earnedPoints,
        },
        { transaction }
      );
    }

    await CartItem.destroy({ where: { cart_id: cart.id }, transaction });
    await cart.update({ status: 'converted', coupon_id: null }, { transaction });

    await createNotification({
      userId,
      title: `Order ${order.order_number} Confirmed`,
      message:
        payload.payment_method === 'manual_upi'
          ? `Thank you for ordering from Taantira. Your order ${order.order_number} is recorded (${isManualUpiWithUtr ? 'UTR awaiting finance verification' : 'awaiting UPI UTR submission'}).`
          : `Thank you for ordering from Taantira. Your COD order ${order.order_number} has been confirmed.`,
      category: 'order',
      linkUrl: `/account/orders/${order.id}`,
      transaction,
    });

    return { order, payment, pricing };
  });

  return orderResult;
};

module.exports = { placeOrderFromCart, generateOrderNumber, generateDeliveryOtp };
