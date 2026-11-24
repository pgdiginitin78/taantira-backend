'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const idCol = { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true };
    const timestamps = {
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    };

    await queryInterface.createTable('coupons', {
      id: idCol,
      code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      description: { type: Sequelize.STRING(255), allowNull: true },
      discount_type: { type: Sequelize.ENUM('percentage', 'fixed'), allowNull: false },
      discount_value: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      min_purchase_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0.0 },
      max_discount_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      starts_at: { type: Sequelize.DATE, allowNull: false },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      usage_limit: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      per_customer_limit: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
      used_count: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...timestamps,
    });

    await queryInterface.createTable('coupon_products', {
      id: idCol,
      coupon_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'coupons', key: 'id' }, onDelete: 'CASCADE' },
      product_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'products', key: 'id' }, onDelete: 'CASCADE' },
      ...timestamps,
    });

    await queryInterface.createTable('coupon_categories', {
      id: idCol,
      coupon_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'coupons', key: 'id' }, onDelete: 'CASCADE' },
      category_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'categories', key: 'id' }, onDelete: 'CASCADE' },
      ...timestamps,
    });

    await queryInterface.createTable('carts', {
      id: idCol,
      user_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      session_key: { type: Sequelize.STRING(120), allowNull: true },
      coupon_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true, references: { model: 'coupons', key: 'id' }, onDelete: 'SET NULL' },
      status: { type: Sequelize.ENUM('active', 'converted', 'abandoned'), allowNull: false, defaultValue: 'active' },
      ...timestamps,
    });

    await queryInterface.createTable('cart_items', {
      id: idCol,
      cart_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'carts', key: 'id' }, onDelete: 'CASCADE' },
      product_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'products', key: 'id' }, onDelete: 'CASCADE' },
      variant_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'product_variants', key: 'id' }, onDelete: 'CASCADE' },
      quantity: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
      custom_options_json: { type: Sequelize.JSON, allowNull: true },
      ...timestamps,
    });

    await queryInterface.createTable('orders', {
      id: idCol,
      order_number: { type: Sequelize.STRING(40), allowNull: false, unique: true },
      user_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'users', key: 'id' } },
      status: {
        type: Sequelize.ENUM('new', 'processing', 'packing', 'ready_for_pickup', 'shipped', 'delivered', 'cancelled', 'failed', 'returned'),
        allowNull: false,
        defaultValue: 'new',
      },
      payment_method: { type: Sequelize.ENUM('cod', 'manual_upi'), allowNull: false },
      payment_status: {
        type: Sequelize.ENUM('pending', 'awaiting_verification', 'paid', 'failed', 'refunded', 'partially_refunded', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
      },
      delivery_mode: { type: Sequelize.ENUM('own_partner', 'third_party_courier'), allowNull: false, defaultValue: 'own_partner' },
      subtotal: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      discount_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0.0 },
      tax_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0.0 },
      shipping_fee: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0.0 },
      total_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      coupon_code: { type: Sequelize.STRING(50), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      delivery_otp_code: { type: Sequelize.STRING(10), allowNull: true },
      delivery_otp_attempts: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
      otp_verified_at: { type: Sequelize.DATE, allowNull: true },
      placed_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      delivered_at: { type: Sequelize.DATE, allowNull: true },
      cancelled_at: { type: Sequelize.DATE, allowNull: true },
      ...timestamps,
    });

    await queryInterface.createTable('order_items', {
      id: idCol,
      order_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'orders', key: 'id' }, onDelete: 'CASCADE' },
      product_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'products', key: 'id' } },
      variant_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'product_variants', key: 'id' } },
      product_name: { type: Sequelize.STRING(200), allowNull: false },
      sku: { type: Sequelize.STRING(100), allowNull: false },
      size: { type: Sequelize.STRING(40), allowNull: false },
      color_name: { type: Sequelize.STRING(60), allowNull: false },
      quantity: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      unit_price: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      tax_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0.0 },
      total_price: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      custom_options_json: { type: Sequelize.JSON, allowNull: true },
      image_url: { type: Sequelize.STRING(500), allowNull: true },
      ...timestamps,
    });

    await queryInterface.createTable('order_addresses', {
      id: idCol,
      order_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, unique: true, references: { model: 'orders', key: 'id' }, onDelete: 'CASCADE' },
      recipient_name: { type: Sequelize.STRING(120), allowNull: false },
      phone: { type: Sequelize.STRING(20), allowNull: false },
      email: { type: Sequelize.STRING(180), allowNull: false },
      address_line1: { type: Sequelize.STRING(255), allowNull: false },
      address_line2: { type: Sequelize.STRING(255), allowNull: true },
      landmark: { type: Sequelize.STRING(150), allowNull: true },
      city: { type: Sequelize.STRING(100), allowNull: false },
      state: { type: Sequelize.STRING(100), allowNull: false },
      pincode: { type: Sequelize.STRING(12), allowNull: false },
      country: { type: Sequelize.STRING(80), allowNull: false, defaultValue: 'India' },
      latitude: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
      longitude: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
      ...timestamps,
    });

    await queryInterface.createTable('order_status_history', {
      id: idCol,
      order_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'orders', key: 'id' }, onDelete: 'CASCADE' },
      from_status: { type: Sequelize.STRING(40), allowNull: true },
      to_status: { type: Sequelize.STRING(40), allowNull: false },
      note: { type: Sequelize.STRING(255), allowNull: true },
      changed_by: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      ...timestamps,
    });

    await queryInterface.createTable('order_cancellations', {
      id: idCol,
      order_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'orders', key: 'id' }, onDelete: 'CASCADE' },
      requested_by: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'users', key: 'id' } },
      reason: { type: Sequelize.STRING(160), allowNull: false },
      details: { type: Sequelize.TEXT, allowNull: true },
      status: { type: Sequelize.ENUM('requested', 'approved', 'rejected'), allowNull: false, defaultValue: 'approved' },
      reviewed_by: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      reviewed_at: { type: Sequelize.DATE, allowNull: true },
      ...timestamps,
    });

    await queryInterface.createTable('coupon_usage', {
      id: idCol,
      coupon_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'coupons', key: 'id' }, onDelete: 'CASCADE' },
      user_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'users', key: 'id' } },
      order_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'orders', key: 'id' }, onDelete: 'CASCADE' },
      discount_applied: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      used_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      ...timestamps,
    });

    await queryInterface.createTable('stock_reservations', {
      id: idCol,
      warehouse_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'warehouses', key: 'id' } },
      variant_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'product_variants', key: 'id' } },
      order_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true, references: { model: 'orders', key: 'id' }, onDelete: 'CASCADE' },
      cart_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true, references: { model: 'carts', key: 'id' }, onDelete: 'CASCADE' },
      quantity: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      status: { type: Sequelize.ENUM('active', 'committed', 'released', 'expired'), allowNull: false, defaultValue: 'active' },
      expires_at: { type: Sequelize.DATE, allowNull: true },
      ...timestamps,
    });

    await queryInterface.createTable('product_reviews', {
      id: idCol,
      product_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'products', key: 'id' }, onDelete: 'CASCADE' },
      user_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'users', key: 'id' } },
      order_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true, references: { model: 'orders', key: 'id' }, onDelete: 'SET NULL' },
      rating: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false },
      title: { type: Sequelize.STRING(150), allowNull: true },
      comment: { type: Sequelize.TEXT, allowNull: false },
      is_verified_purchase: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      is_approved: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...timestamps,
    });

    await queryInterface.createTable('product_questions', {
      id: idCol,
      product_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'products', key: 'id' }, onDelete: 'CASCADE' },
      user_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'users', key: 'id' } },
      question: { type: Sequelize.TEXT, allowNull: false },
      answer: { type: Sequelize.TEXT, allowNull: true },
      answered_by: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      answered_at: { type: Sequelize.DATE, allowNull: true },
      is_published: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...timestamps,
    });

    await queryInterface.createTable('payments', {
      id: idCol,
      order_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'orders', key: 'id' }, onDelete: 'CASCADE' },
      user_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'users', key: 'id' } },
      method: { type: Sequelize.ENUM('cod', 'manual_upi'), allowNull: false },
      status: {
        type: Sequelize.ENUM('pending', 'awaiting_verification', 'paid', 'failed', 'refunded', 'partially_refunded', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
      },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      currency: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'INR' },
      upi_vpa: { type: Sequelize.STRING(120), allowNull: true },
      customer_utr: { type: Sequelize.STRING(80), allowNull: true },
      submitted_at: { type: Sequelize.DATE, allowNull: true },
      verified_by: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      verified_at: { type: Sequelize.DATE, allowNull: true },
      verification_note: { type: Sequelize.STRING(255), allowNull: true },
      ...timestamps,
    });

    await queryInterface.createTable('payment_transactions', {
      id: idCol,
      payment_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'payments', key: 'id' }, onDelete: 'CASCADE' },
      order_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'orders', key: 'id' }, onDelete: 'CASCADE' },
      transaction_type: { type: Sequelize.ENUM('utr_submitted', 'verified', 'cod_collected', 'failed', 'refund'), allowNull: false },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      reference_number: { type: Sequelize.STRING(120), allowNull: true },
      status: { type: Sequelize.STRING(40), allowNull: false },
      gateway_payload_json: { type: Sequelize.JSON, allowNull: true },
      ...timestamps,
    });

    await queryInterface.createTable('refunds', {
      id: idCol,
      order_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'orders', key: 'id' }, onDelete: 'CASCADE' },
      payment_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'payments', key: 'id' }, onDelete: 'CASCADE' },
      user_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'users', key: 'id' } },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      refund_type: { type: Sequelize.ENUM('full', 'partial'), allowNull: false, defaultValue: 'full' },
      reason: { type: Sequelize.STRING(255), allowNull: false },
      status: { type: Sequelize.ENUM('requested', 'approved', 'processed', 'rejected'), allowNull: false, defaultValue: 'requested' },
      reference_number: { type: Sequelize.STRING(120), allowNull: true },
      processed_by: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      processed_at: { type: Sequelize.DATE, allowNull: true },
      ...timestamps,
    });

    await queryInterface.createTable('refund_items', {
      id: idCol,
      refund_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'refunds', key: 'id' }, onDelete: 'CASCADE' },
      order_item_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'order_items', key: 'id' }, onDelete: 'CASCADE' },
      quantity: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      ...timestamps,
    });

    await queryInterface.createTable('payment_reconciliation', {
      id: idCol,
      payment_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'payments', key: 'id' }, onDelete: 'CASCADE' },
      order_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'orders', key: 'id' }, onDelete: 'CASCADE' },
      expected_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      received_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      discrepancy_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0.0 },
      status: { type: Sequelize.ENUM('matched', 'discrepancy', 'resolved'), allowNull: false, defaultValue: 'matched' },
      reconciled_by: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'users', key: 'id' } },
      reconciled_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      notes: { type: Sequelize.STRING(255), allowNull: true },
      ...timestamps,
    });

    await queryInterface.createTable('return_requests', {
      id: idCol,
      order_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'orders', key: 'id' }, onDelete: 'CASCADE' },
      user_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'users', key: 'id' } },
      request_type: { type: Sequelize.ENUM('return', 'exchange'), allowNull: false, defaultValue: 'return' },
      reason: { type: Sequelize.STRING(180), allowNull: false },
      details: { type: Sequelize.TEXT, allowNull: true },
      evidence_urls_json: { type: Sequelize.JSON, allowNull: true },
      status: { type: Sequelize.ENUM('requested', 'approved', 'pickup_scheduled', 'picked_up', 'completed', 'rejected'), allowNull: false, defaultValue: 'requested' },
      admin_notes: { type: Sequelize.STRING(255), allowNull: true },
      approved_by: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      approved_at: { type: Sequelize.DATE, allowNull: true },
      ...timestamps,
    });

    await queryInterface.createTable('return_items', {
      id: idCol,
      return_request_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'return_requests', key: 'id' }, onDelete: 'CASCADE' },
      order_item_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'order_items', key: 'id' }, onDelete: 'CASCADE' },
      quantity: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      condition_note: { type: Sequelize.STRING(255), allowNull: true },
      ...timestamps,
    });

    await queryInterface.createTable('exchange_requests', {
      id: idCol,
      return_request_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'return_requests', key: 'id' }, onDelete: 'CASCADE' },
      order_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'orders', key: 'id' }, onDelete: 'CASCADE' },
      original_variant_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'product_variants', key: 'id' } },
      requested_variant_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'product_variants', key: 'id' } },
      status: { type: Sequelize.ENUM('requested', 'approved', 'dispatched', 'completed', 'rejected'), allowNull: false, defaultValue: 'requested' },
      notes: { type: Sequelize.STRING(255), allowNull: true },
      ...timestamps,
    });
  },

  async down(queryInterface) {
    const tables = [
      'exchange_requests', 'return_items', 'return_requests', 'payment_reconciliation',
      'refund_items', 'refunds', 'payment_transactions', 'payments', 'product_questions',
      'product_reviews', 'stock_reservations', 'coupon_usage', 'order_cancellations',
      'order_status_history', 'order_addresses', 'order_items', 'orders', 'cart_items',
      'carts', 'coupon_categories', 'coupon_products', 'coupons',
    ];
    for (const table of tables) {
      await queryInterface.dropTable(table);
    }
  },
};
