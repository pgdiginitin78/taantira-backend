const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Cart = sequelize.define(
    'Cart',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      session_key: { type: DataTypes.STRING(120), allowNull: true },
      coupon_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      status: {
        type: DataTypes.ENUM('active', 'converted', 'abandoned'),
        allowNull: false,
        defaultValue: 'active',
      },
    },
    { tableName: 'carts' }
  );

  const CartItem = sequelize.define(
    'CartItem',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      cart_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      product_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      variant_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      quantity: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
      custom_options_json: { type: DataTypes.JSON, allowNull: true },
    },
    { tableName: 'cart_items' }
  );

  const Coupon = sequelize.define(
    'Coupon',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      description: { type: DataTypes.STRING(255), allowNull: true },
      discount_type: { type: DataTypes.ENUM('percentage', 'fixed'), allowNull: false },
      discount_value: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      min_purchase_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0.0 },
      max_discount_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
      starts_at: { type: DataTypes.DATE, allowNull: false },
      expires_at: { type: DataTypes.DATE, allowNull: false },
      usage_limit: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      per_customer_limit: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
      used_count: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'coupons' }
  );

  const CouponProduct = sequelize.define(
    'CouponProduct',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      coupon_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      product_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    },
    { tableName: 'coupon_products' }
  );

  const CouponCategory = sequelize.define(
    'CouponCategory',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      coupon_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      category_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    },
    { tableName: 'coupon_categories' }
  );

  const CouponUsage = sequelize.define(
    'CouponUsage',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      coupon_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      order_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      discount_applied: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      used_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    { tableName: 'coupon_usage' }
  );

  return { Cart, CartItem, Coupon, CouponProduct, CouponCategory, CouponUsage };
};
