const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Order = sequelize.define(
    'Order',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      order_number: { type: DataTypes.STRING(40), allowNull: false, unique: true },
      user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      status: {
        type: DataTypes.ENUM(
          'new',
          'processing',
          'packing',
          'ready_for_pickup',
          'shipped',
          'delivered',
          'cancelled',
          'failed',
          'returned'
        ),
        allowNull: false,
        defaultValue: 'new',
      },
      payment_method: {
        type: DataTypes.ENUM('cod', 'manual_upi'),
        allowNull: false,
      },
      payment_status: {
        type: DataTypes.ENUM(
          'pending',
          'awaiting_verification',
          'paid',
          'failed',
          'refunded',
          'partially_refunded',
          'cancelled'
        ),
        allowNull: false,
        defaultValue: 'pending',
      },
      delivery_mode: {
        type: DataTypes.ENUM('own_partner', 'third_party_courier'),
        allowNull: false,
        defaultValue: 'own_partner',
      },
      subtotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      discount_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0.0 },
      tax_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0.0 },
      shipping_fee: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.0 },
      total_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      coupon_code: { type: DataTypes.STRING(50), allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      delivery_otp_code: { type: DataTypes.STRING(10), allowNull: true },
      delivery_otp_attempts: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
      otp_verified_at: { type: DataTypes.DATE, allowNull: true },
      placed_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      delivered_at: { type: DataTypes.DATE, allowNull: true },
      cancelled_at: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: 'orders' }
  );

  const OrderItem = sequelize.define(
    'OrderItem',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      order_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      product_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      variant_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      product_name: { type: DataTypes.STRING(200), allowNull: false },
      sku: { type: DataTypes.STRING(100), allowNull: false },
      size: { type: DataTypes.STRING(40), allowNull: false },
      color_name: { type: DataTypes.STRING(60), allowNull: false },
      quantity: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      unit_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      tax_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0.0 },
      total_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      custom_options_json: { type: DataTypes.JSON, allowNull: true },
      image_url: { type: DataTypes.STRING(500), allowNull: true },
    },
    { tableName: 'order_items' }
  );

  const OrderAddress = sequelize.define(
    'OrderAddress',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      order_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, unique: true },
      recipient_name: { type: DataTypes.STRING(120), allowNull: false },
      phone: { type: DataTypes.STRING(20), allowNull: false },
      email: { type: DataTypes.STRING(180), allowNull: false },
      address_line1: { type: DataTypes.STRING(255), allowNull: false },
      address_line2: { type: DataTypes.STRING(255), allowNull: true },
      landmark: { type: DataTypes.STRING(150), allowNull: true },
      city: { type: DataTypes.STRING(100), allowNull: false },
      state: { type: DataTypes.STRING(100), allowNull: false },
      pincode: { type: DataTypes.STRING(12), allowNull: false },
      country: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'India' },
      latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
      longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    },
    { tableName: 'order_addresses' }
  );

  const OrderStatusHistory = sequelize.define(
    'OrderStatusHistory',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      order_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      from_status: { type: DataTypes.STRING(40), allowNull: true },
      to_status: { type: DataTypes.STRING(40), allowNull: false },
      note: { type: DataTypes.STRING(255), allowNull: true },
      changed_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    },
    { tableName: 'order_status_history' }
  );

  const OrderCancellation = sequelize.define(
    'OrderCancellation',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      order_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      requested_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      reason: { type: DataTypes.STRING(160), allowNull: false },
      details: { type: DataTypes.TEXT, allowNull: true },
      status: {
        type: DataTypes.ENUM('requested', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'approved',
      },
      reviewed_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      reviewed_at: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: 'order_cancellations' }
  );

  return { Order, OrderItem, OrderAddress, OrderStatusHistory, OrderCancellation };
};
