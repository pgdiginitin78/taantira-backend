const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ReturnRequest = sequelize.define(
    'ReturnRequest',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      order_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      request_type: { type: DataTypes.ENUM('return', 'exchange'), allowNull: false, defaultValue: 'return' },
      reason: { type: DataTypes.STRING(180), allowNull: false },
      details: { type: DataTypes.TEXT, allowNull: true },
      evidence_urls_json: { type: DataTypes.JSON, allowNull: true },
      status: {
        type: DataTypes.ENUM('requested', 'approved', 'pickup_scheduled', 'picked_up', 'completed', 'rejected'),
        allowNull: false,
        defaultValue: 'requested',
      },
      admin_notes: { type: DataTypes.STRING(255), allowNull: true },
      approved_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      approved_at: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: 'return_requests' }
  );

  const ReturnItem = sequelize.define(
    'ReturnItem',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      return_request_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      order_item_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      quantity: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      condition_note: { type: DataTypes.STRING(255), allowNull: true },
    },
    { tableName: 'return_items' }
  );

  const ExchangeRequest = sequelize.define(
    'ExchangeRequest',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      return_request_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      order_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      original_variant_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      requested_variant_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      status: {
        type: DataTypes.ENUM('requested', 'approved', 'dispatched', 'completed', 'rejected'),
        allowNull: false,
        defaultValue: 'requested',
      },
      notes: { type: DataTypes.STRING(255), allowNull: true },
    },
    { tableName: 'exchange_requests' }
  );

  const ReturnPickup = sequelize.define(
    'ReturnPickup',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      return_request_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      delivery_partner_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      pickup_status: {
        type: DataTypes.ENUM('pending', 'assigned', 'picked_up', 'failed'),
        allowNull: false,
        defaultValue: 'pending',
      },
      scheduled_date: { type: DataTypes.DATEONLY, allowNull: true },
      picked_up_at: { type: DataTypes.DATE, allowNull: true },
      notes: { type: DataTypes.STRING(255), allowNull: true },
    },
    { tableName: 'return_pickups' }
  );

  return { ReturnRequest, ReturnItem, ExchangeRequest, ReturnPickup };
};
