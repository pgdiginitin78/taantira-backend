const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Warehouse = sequelize.define(
    'Warehouse',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(120), allowNull: false },
      code: { type: DataTypes.STRING(40), allowNull: false, unique: true },
      address: { type: DataTypes.STRING(255), allowNull: false },
      city: { type: DataTypes.STRING(100), allowNull: false },
      state: { type: DataTypes.STRING(100), allowNull: false },
      pincode: { type: DataTypes.STRING(12), allowNull: false },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      is_default: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    { tableName: 'warehouses' }
  );

  const WarehouseStock = sequelize.define(
    'WarehouseStock',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      warehouse_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      variant_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      quantity_on_hand: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      quantity_reserved: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      reorder_level: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
    },
    { tableName: 'warehouse_stock' }
  );

  const StockMovement = sequelize.define(
    'StockMovement',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      warehouse_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      variant_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      movement_type: {
        type: DataTypes.ENUM('purchase', 'adjustment', 'sale', 'reservation', 'release', 'return', 'rto'),
        allowNull: false,
      },
      quantity_delta: { type: DataTypes.INTEGER, allowNull: false },
      reference_type: { type: DataTypes.STRING(60), allowNull: true },
      reference_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      notes: { type: DataTypes.STRING(255), allowNull: true },
      performed_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    },
    { tableName: 'stock_movements' }
  );

  const StockReservation = sequelize.define(
    'StockReservation',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      warehouse_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      variant_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      order_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      cart_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      quantity: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      status: {
        type: DataTypes.ENUM('active', 'committed', 'released', 'expired'),
        allowNull: false,
        defaultValue: 'active',
      },
      expires_at: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: 'stock_reservations' }
  );

  return { Warehouse, WarehouseStock, StockMovement, StockReservation };
};
