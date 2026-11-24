'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const idCol = { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true };
    const timestamps = {
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    };

    await queryInterface.createTable('users', {
      id: idCol,
      full_name: { type: Sequelize.STRING(120), allowNull: false },
      email: { type: Sequelize.STRING(180), allowNull: false, unique: true },
      phone: { type: Sequelize.STRING(20), allowNull: true, unique: true },
      password_hash: { type: Sequelize.STRING(255), allowNull: false },
      status: { type: Sequelize.ENUM('active', 'inactive', 'suspended'), allowNull: false, defaultValue: 'active' },
      is_email_verified: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      last_login_at: { type: Sequelize.DATE, allowNull: true },
      ...timestamps,
    });

    await queryInterface.createTable('roles', {
      id: idCol,
      name: { type: Sequelize.STRING(80), allowNull: false },
      slug: { type: Sequelize.STRING(80), allowNull: false, unique: true },
      description: { type: Sequelize.STRING(255), allowNull: true },
      is_system: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...timestamps,
    });

    await queryInterface.createTable('permissions', {
      id: idCol,
      name: { type: Sequelize.STRING(100), allowNull: false },
      slug: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      module: { type: Sequelize.STRING(60), allowNull: false },
      description: { type: Sequelize.STRING(255), allowNull: true },
      ...timestamps,
    });

    await queryInterface.createTable('user_roles', {
      id: idCol,
      user_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      role_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'roles', key: 'id' }, onDelete: 'CASCADE' },
      ...timestamps,
    });
    await queryInterface.addConstraint('user_roles', { fields: ['user_id', 'role_id'], type: 'unique', name: 'uq_user_roles_pair' });

    await queryInterface.createTable('role_permissions', {
      id: idCol,
      role_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'roles', key: 'id' }, onDelete: 'CASCADE' },
      permission_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'permissions', key: 'id' }, onDelete: 'CASCADE' },
      ...timestamps,
    });
    await queryInterface.addConstraint('role_permissions', { fields: ['role_id', 'permission_id'], type: 'unique', name: 'uq_role_permissions_pair' });

    await queryInterface.createTable('refresh_tokens', {
      id: idCol,
      user_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      token_hash: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      user_agent: { type: Sequelize.STRING(255), allowNull: true },
      ip_address: { type: Sequelize.STRING(64), allowNull: true },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      revoked_at: { type: Sequelize.DATE, allowNull: true },
      replaced_by_token_hash: { type: Sequelize.STRING(255), allowNull: true },
      ...timestamps,
    });

    await queryInterface.createTable('customer_profiles', {
      id: idCol,
      user_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, unique: true, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      date_of_birth: { type: Sequelize.DATEONLY, allowNull: true },
      preferred_size: { type: Sequelize.STRING(20), allowNull: true },
      loyalty_points: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      total_spent: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0.0 },
      total_orders: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      marketing_opt_in: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      ...timestamps,
    });

    await queryInterface.createTable('customer_addresses', {
      id: idCol,
      user_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      label: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'Home' },
      recipient_name: { type: Sequelize.STRING(120), allowNull: false },
      phone: { type: Sequelize.STRING(20), allowNull: false },
      address_line1: { type: Sequelize.STRING(255), allowNull: false },
      address_line2: { type: Sequelize.STRING(255), allowNull: true },
      landmark: { type: Sequelize.STRING(150), allowNull: true },
      city: { type: Sequelize.STRING(100), allowNull: false },
      state: { type: Sequelize.STRING(100), allowNull: false },
      pincode: { type: Sequelize.STRING(12), allowNull: false },
      country: { type: Sequelize.STRING(80), allowNull: false, defaultValue: 'India' },
      latitude: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
      longitude: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
      is_default: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      ...timestamps,
    });

    await queryInterface.createTable('wishlists', {
      id: idCol,
      user_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, unique: true, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      name: { type: Sequelize.STRING(80), allowNull: false, defaultValue: 'My Taantira Wishlist' },
      ...timestamps,
    });

    await queryInterface.createTable('categories', {
      id: idCol,
      name: { type: Sequelize.STRING(120), allowNull: false },
      slug: { type: Sequelize.STRING(140), allowNull: false, unique: true },
      parent_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true, references: { model: 'categories', key: 'id' }, onDelete: 'SET NULL' },
      description: { type: Sequelize.TEXT, allowNull: true },
      image_url: { type: Sequelize.STRING(500), allowNull: true },
      sort_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      supports_blouse_option: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      supports_petticoat_option: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      supports_customisation: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      supports_gift_options: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...timestamps,
    });

    await queryInterface.createTable('products', {
      id: idCol,
      name: { type: Sequelize.STRING(200), allowNull: false },
      slug: { type: Sequelize.STRING(220), allowNull: false, unique: true },
      sku: { type: Sequelize.STRING(80), allowNull: false, unique: true },
      primary_category_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'categories', key: 'id' } },
      short_description: { type: Sequelize.STRING(500), allowNull: true },
      description: { type: Sequelize.TEXT, allowNull: false },
      story: { type: Sequelize.TEXT, allowNull: true },
      base_price: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      sale_price: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      tax_rate: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 12.0 },
      fabric: { type: Sequelize.STRING(120), allowNull: false },
      occasion: { type: Sequelize.STRING(120), allowNull: false },
      length_width: { type: Sequelize.STRING(180), allowNull: true },
      wash_care: { type: Sequelize.STRING(255), allowNull: true },
      manufacturing_info: { type: Sequelize.STRING(255), allowNull: true },
      country_of_origin: { type: Sequelize.STRING(80), allowNull: false, defaultValue: 'India' },
      return_policy: { type: Sequelize.STRING(255), allowNull: false, defaultValue: '7-day easy return & size exchange' },
      is_featured: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      is_new_arrival: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      is_best_seller: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      is_trending: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      rating_avg: { type: Sequelize.DECIMAL(3, 2), allowNull: false, defaultValue: 0.0 },
      review_count: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      matching_product_ids_json: { type: Sequelize.JSON, allowNull: true },
      ...timestamps,
    });

    await queryInterface.createTable('product_categories', {
      id: idCol,
      product_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'products', key: 'id' }, onDelete: 'CASCADE' },
      category_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'categories', key: 'id' }, onDelete: 'CASCADE' },
      ...timestamps,
    });

    await queryInterface.createTable('collections', {
      id: idCol,
      name: { type: Sequelize.STRING(140), allowNull: false },
      slug: { type: Sequelize.STRING(160), allowNull: false, unique: true },
      subtitle: { type: Sequelize.STRING(255), allowNull: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      banner_image_url: { type: Sequelize.STRING(500), allowNull: true },
      starts_at: { type: Sequelize.DATE, allowNull: true },
      ends_at: { type: Sequelize.DATE, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      sort_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      ...timestamps,
    });

    await queryInterface.createTable('collection_products', {
      id: idCol,
      collection_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'collections', key: 'id' }, onDelete: 'CASCADE' },
      product_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'products', key: 'id' }, onDelete: 'CASCADE' },
      sort_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      ...timestamps,
    });

    await queryInterface.createTable('media_files', {
      id: idCol,
      filename: { type: Sequelize.STRING(200), allowNull: false },
      mime_type: { type: Sequelize.STRING(80), allowNull: false },
      size_bytes: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      data: { type: Sequelize.BLOB('long'), allowNull: false },
      uploaded_by: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      ...timestamps,
    });

    await queryInterface.createTable('product_variants', {
      id: idCol,
      product_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'products', key: 'id' }, onDelete: 'CASCADE' },
      sku: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      size: { type: Sequelize.STRING(40), allowNull: false },
      color_name: { type: Sequelize.STRING(60), allowNull: false },
      color_hex: { type: Sequelize.STRING(16), allowNull: false },
      price_override: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      stock_qty: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      reserved_qty: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      low_stock_threshold: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 5 },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...timestamps,
    });

    await queryInterface.createTable('product_images', {
      id: idCol,
      product_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'products', key: 'id' }, onDelete: 'CASCADE' },
      variant_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true, references: { model: 'product_variants', key: 'id' }, onDelete: 'SET NULL' },
      image_url: { type: Sequelize.STRING(500), allowNull: false },
      media_file_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true, references: { model: 'media_files', key: 'id' }, onDelete: 'SET NULL' },
      alt_text: { type: Sequelize.STRING(255), allowNull: true },
      is_primary: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      sort_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      ...timestamps,
    });

    await queryInterface.createTable('wishlist_items', {
      id: idCol,
      wishlist_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'wishlists', key: 'id' }, onDelete: 'CASCADE' },
      product_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'products', key: 'id' }, onDelete: 'CASCADE' },
      variant_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true, references: { model: 'product_variants', key: 'id' }, onDelete: 'SET NULL' },
      ...timestamps,
    });

    await queryInterface.createTable('product_attributes', {
      id: idCol,
      name: { type: Sequelize.STRING(80), allowNull: false },
      slug: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      ...timestamps,
    });

    await queryInterface.createTable('attribute_values', {
      id: idCol,
      attribute_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'product_attributes', key: 'id' }, onDelete: 'CASCADE' },
      product_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'products', key: 'id' }, onDelete: 'CASCADE' },
      value: { type: Sequelize.STRING(140), allowNull: false },
      ...timestamps,
    });

    await queryInterface.createTable('warehouses', {
      id: idCol,
      name: { type: Sequelize.STRING(120), allowNull: false },
      code: { type: Sequelize.STRING(40), allowNull: false, unique: true },
      address: { type: Sequelize.STRING(255), allowNull: false },
      city: { type: Sequelize.STRING(100), allowNull: false },
      state: { type: Sequelize.STRING(100), allowNull: false },
      pincode: { type: Sequelize.STRING(12), allowNull: false },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      is_default: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      ...timestamps,
    });

    await queryInterface.createTable('warehouse_stock', {
      id: idCol,
      warehouse_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'warehouses', key: 'id' }, onDelete: 'CASCADE' },
      variant_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'product_variants', key: 'id' }, onDelete: 'CASCADE' },
      quantity_on_hand: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      quantity_reserved: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      reorder_level: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 5 },
      ...timestamps,
    });
    await queryInterface.addConstraint('warehouse_stock', { fields: ['warehouse_id', 'variant_id'], type: 'unique', name: 'uq_warehouse_variant' });

    await queryInterface.createTable('stock_movements', {
      id: idCol,
      warehouse_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'warehouses', key: 'id' }, onDelete: 'CASCADE' },
      variant_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'product_variants', key: 'id' }, onDelete: 'CASCADE' },
      movement_type: { type: Sequelize.ENUM('purchase', 'adjustment', 'sale', 'reservation', 'release', 'return', 'rto'), allowNull: false },
      quantity_delta: { type: Sequelize.INTEGER, allowNull: false },
      reference_type: { type: Sequelize.STRING(60), allowNull: true },
      reference_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
      notes: { type: Sequelize.STRING(255), allowNull: true },
      performed_by: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      ...timestamps,
    });
  },

  async down(queryInterface) {
    const tables = [
      'stock_movements', 'warehouse_stock', 'warehouses', 'attribute_values', 'product_attributes',
      'wishlist_items', 'product_images', 'product_variants', 'media_files', 'collection_products',
      'collections', 'product_categories', 'products', 'categories', 'wishlists', 'customer_addresses',
      'customer_profiles', 'refresh_tokens', 'role_permissions', 'user_roles', 'permissions', 'roles', 'users',
    ];
    for (const table of tables) {
      await queryInterface.dropTable(table);
    }
  },
};
