const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CustomerProfile = sequelize.define(
    'CustomerProfile',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, unique: true },
      date_of_birth: { type: DataTypes.DATEONLY, allowNull: true },
      preferred_size: { type: DataTypes.STRING(20), allowNull: true },
      loyalty_points: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      total_spent: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0.0 },
      total_orders: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      marketing_opt_in: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
    },
    { tableName: 'customer_profiles' }
  );

  const CustomerAddress = sequelize.define(
    'CustomerAddress',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      label: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'Home' },
      recipient_name: { type: DataTypes.STRING(120), allowNull: false },
      phone: { type: DataTypes.STRING(20), allowNull: false },
      address_line1: { type: DataTypes.STRING(255), allowNull: false },
      address_line2: { type: DataTypes.STRING(255), allowNull: true },
      landmark: { type: DataTypes.STRING(150), allowNull: true },
      city: { type: DataTypes.STRING(100), allowNull: false },
      state: { type: DataTypes.STRING(100), allowNull: false },
      pincode: { type: DataTypes.STRING(12), allowNull: false },
      country: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'India' },
      latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
      longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
      is_default: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    { tableName: 'customer_addresses' }
  );

  const Wishlist = sequelize.define(
    'Wishlist',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, unique: true },
      name: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'My Taantira Wishlist' },
    },
    { tableName: 'wishlists' }
  );

  const WishlistItem = sequelize.define(
    'WishlistItem',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      wishlist_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      product_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      variant_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    },
    { tableName: 'wishlist_items' }
  );

  return { CustomerProfile, CustomerAddress, Wishlist, WishlistItem };
};
