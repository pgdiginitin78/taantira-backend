const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Payment = sequelize.define(
    'Payment',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      order_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      method: { type: DataTypes.ENUM('cod', 'manual_upi'), allowNull: false },
      status: {
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
      amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      currency: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'INR' },
      upi_vpa: { type: DataTypes.STRING(120), allowNull: true },
      customer_utr: { type: DataTypes.STRING(80), allowNull: true },
      submitted_at: { type: DataTypes.DATE, allowNull: true },
      verified_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      verified_at: { type: DataTypes.DATE, allowNull: true },
      verification_note: { type: DataTypes.STRING(255), allowNull: true },
    },
    { tableName: 'payments' }
  );

  const PaymentTransaction = sequelize.define(
    'PaymentTransaction',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      payment_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      order_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      transaction_type: {
        type: DataTypes.ENUM('utr_submitted', 'verified', 'cod_collected', 'failed', 'refund'),
        allowNull: false,
      },
      amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      reference_number: { type: DataTypes.STRING(120), allowNull: true },
      status: { type: DataTypes.STRING(40), allowNull: false },
      gateway_payload_json: { type: DataTypes.JSON, allowNull: true },
    },
    { tableName: 'payment_transactions' }
  );

  const Refund = sequelize.define(
    'Refund',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      order_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      payment_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      refund_type: { type: DataTypes.ENUM('full', 'partial'), allowNull: false, defaultValue: 'full' },
      reason: { type: DataTypes.STRING(255), allowNull: false },
      status: {
        type: DataTypes.ENUM('requested', 'approved', 'processed', 'rejected'),
        allowNull: false,
        defaultValue: 'requested',
      },
      reference_number: { type: DataTypes.STRING(120), allowNull: true },
      processed_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      processed_at: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: 'refunds' }
  );

  const RefundItem = sequelize.define(
    'RefundItem',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      refund_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      order_item_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      quantity: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    },
    { tableName: 'refund_items' }
  );

  const PaymentReconciliation = sequelize.define(
    'PaymentReconciliation',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      payment_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      order_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      expected_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      received_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      discrepancy_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0.0 },
      status: {
        type: DataTypes.ENUM('matched', 'discrepancy', 'resolved'),
        allowNull: false,
        defaultValue: 'matched',
      },
      reconciled_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      reconciled_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      notes: { type: DataTypes.STRING(255), allowNull: true },
    },
    { tableName: 'payment_reconciliation' }
  );

  return { Payment, PaymentTransaction, Refund, RefundItem, PaymentReconciliation };
};
