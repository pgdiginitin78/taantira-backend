'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const idCol = { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true };
    const timestamps = {
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    };

    await queryInterface.createTable('delivery_partners', {
      id: idCol,
      user_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, unique: true, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      partner_code: { type: Sequelize.STRING(40), allowNull: false, unique: true },
      address: { type: Sequelize.STRING(255), allowNull: false },
      city: { type: Sequelize.STRING(100), allowNull: false },
      state: { type: Sequelize.STRING(100), allowNull: false },
      pincode: { type: Sequelize.STRING(12), allowNull: false },
      service_pincodes_json: { type: Sequelize.JSON, allowNull: true },
      profile_photo_url: { type: Sequelize.STRING(500), allowNull: true },
      approval_status: { type: Sequelize.ENUM('pending', 'approved', 'rejected', 'suspended'), allowNull: false, defaultValue: 'pending' },
      is_online: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      current_availability: { type: Sequelize.ENUM('offline', 'available', 'on_delivery'), allowNull: false, defaultValue: 'offline' },
      invited_by: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      approved_by: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      approved_at: { type: Sequelize.DATE, allowNull: true },
      rejection_reason: { type: Sequelize.STRING(255), allowNull: true },
      ...timestamps,
    });

    await queryInterface.createTable('delivery_documents', {
      id: idCol,
      delivery_partner_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'delivery_partners', key: 'id' }, onDelete: 'CASCADE' },
      doc_type: { type: Sequelize.STRING(60), allowNull: false },
      doc_number_masked: { type: Sequelize.STRING(60), allowNull: false },
      document_url: { type: Sequelize.STRING(500), allowNull: true },
      media_file_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true, references: { model: 'media_files', key: 'id' }, onDelete: 'SET NULL' },
      verification_status: { type: Sequelize.ENUM('pending', 'verified', 'rejected'), allowNull: false, defaultValue: 'pending' },
      verified_by: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      verified_at: { type: Sequelize.DATE, allowNull: true },
      ...timestamps,
    });

    await queryInterface.createTable('delivery_vehicles', {
      id: idCol,
      delivery_partner_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'delivery_partners', key: 'id' }, onDelete: 'CASCADE' },
      vehicle_type: { type: Sequelize.STRING(40), allowNull: false },
      vehicle_number: { type: Sequelize.STRING(40), allowNull: false },
      model_name: { type: Sequelize.STRING(80), allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...timestamps,
    });

    await queryInterface.createTable('delivery_zones', {
      id: idCol,
      name: { type: Sequelize.STRING(120), allowNull: false },
      city: { type: Sequelize.STRING(100), allowNull: false },
      state: { type: Sequelize.STRING(100), allowNull: false },
      base_fee: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 99.0 },
      per_order_payout: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 65.0 },
      estimated_hours: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 24 },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...timestamps,
    });

    await queryInterface.createTable('delivery_zone_pincodes', {
      id: idCol,
      delivery_zone_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'delivery_zones', key: 'id' }, onDelete: 'CASCADE' },
      pincode: { type: Sequelize.STRING(12), allowNull: false, unique: true },
      is_serviceable: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      cod_available: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...timestamps,
    });

    await queryInterface.createTable('delivery_assignments', {
      id: idCol,
      order_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'orders', key: 'id' }, onDelete: 'CASCADE' },
      delivery_partner_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'delivery_partners', key: 'id' }, onDelete: 'CASCADE' },
      status: {
        type: Sequelize.ENUM('assigned', 'accepted', 'rejected', 'picked_up', 'out_for_delivery', 'delivered', 'failed', 'rto'),
        allowNull: false,
        defaultValue: 'assigned',
      },
      assigned_by: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      assigned_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      accepted_at: { type: Sequelize.DATE, allowNull: true },
      picked_up_at: { type: Sequelize.DATE, allowNull: true },
      out_for_delivery_at: { type: Sequelize.DATE, allowNull: true },
      delivered_at: { type: Sequelize.DATE, allowNull: true },
      rejection_reason: { type: Sequelize.STRING(255), allowNull: true },
      ...timestamps,
    });

    await queryInterface.createTable('delivery_status_history', {
      id: idCol,
      delivery_assignment_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'delivery_assignments', key: 'id' }, onDelete: 'CASCADE' },
      status: { type: Sequelize.STRING(40), allowNull: false },
      note: { type: Sequelize.STRING(255), allowNull: true },
      changed_by: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      ...timestamps,
    });

    await queryInterface.createTable('delivery_partner_current_locations', {
      id: idCol,
      delivery_partner_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, unique: true, references: { model: 'delivery_partners', key: 'id' }, onDelete: 'CASCADE' },
      delivery_assignment_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true, references: { model: 'delivery_assignments', key: 'id' }, onDelete: 'SET NULL' },
      latitude: { type: Sequelize.DECIMAL(10, 7), allowNull: false },
      longitude: { type: Sequelize.DECIMAL(10, 7), allowNull: false },
      accuracy_meters: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
      speed_mps: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
      heading: { type: Sequelize.DECIMAL(6, 2), allowNull: true },
      recorded_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      ...timestamps,
    });

    await queryInterface.createTable('delivery_location_history', {
      id: idCol,
      delivery_partner_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'delivery_partners', key: 'id' }, onDelete: 'CASCADE' },
      delivery_assignment_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true, references: { model: 'delivery_assignments', key: 'id' }, onDelete: 'SET NULL' },
      latitude: { type: Sequelize.DECIMAL(10, 7), allowNull: false },
      longitude: { type: Sequelize.DECIMAL(10, 7), allowNull: false },
      accuracy_meters: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
      recorded_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      ...timestamps,
    });

    await queryInterface.createTable('delivery_proofs', {
      id: idCol,
      delivery_assignment_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, unique: true, references: { model: 'delivery_assignments', key: 'id' }, onDelete: 'CASCADE' },
      order_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'orders', key: 'id' }, onDelete: 'CASCADE' },
      otp_verified: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      recipient_name: { type: Sequelize.STRING(120), allowNull: true },
      note: { type: Sequelize.STRING(255), allowNull: true },
      proof_image_url: { type: Sequelize.STRING(500), allowNull: true },
      media_file_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true, references: { model: 'media_files', key: 'id' }, onDelete: 'SET NULL' },
      delivered_latitude: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
      delivered_longitude: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
      captured_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      ...timestamps,
    });

    await queryInterface.createTable('return_pickups', {
      id: idCol,
      return_request_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'return_requests', key: 'id' }, onDelete: 'CASCADE' },
      delivery_partner_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true, references: { model: 'delivery_partners', key: 'id' }, onDelete: 'SET NULL' },
      pickup_status: { type: Sequelize.ENUM('pending', 'assigned', 'picked_up', 'failed'), allowNull: false, defaultValue: 'pending' },
      scheduled_date: { type: Sequelize.DATEONLY, allowNull: true },
      picked_up_at: { type: Sequelize.DATE, allowNull: true },
      notes: { type: Sequelize.STRING(255), allowNull: true },
      ...timestamps,
    });

    await queryInterface.createTable('courier_shipments', {
      id: idCol,
      order_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, unique: true, references: { model: 'orders', key: 'id' }, onDelete: 'CASCADE' },
      courier_company: { type: Sequelize.STRING(120), allowNull: false },
      awb_number: { type: Sequelize.STRING(80), allowNull: false },
      tracking_url: { type: Sequelize.STRING(500), allowNull: true },
      pickup_date: { type: Sequelize.DATEONLY, allowNull: true },
      shipment_status: { type: Sequelize.STRING(60), allowNull: false, defaultValue: 'booked' },
      estimated_delivery_date: { type: Sequelize.DATEONLY, allowNull: true },
      notes: { type: Sequelize.STRING(255), allowNull: true },
      created_by: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      ...timestamps,
    });

    await queryInterface.createTable('courier_tracking_events', {
      id: idCol,
      courier_shipment_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'courier_shipments', key: 'id' }, onDelete: 'CASCADE' },
      status: { type: Sequelize.STRING(80), allowNull: false },
      location: { type: Sequelize.STRING(120), allowNull: true },
      description: { type: Sequelize.STRING(255), allowNull: false },
      event_time: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_by: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      ...timestamps,
    });

    await queryInterface.createTable('delivery_settlements', {
      id: idCol,
      delivery_partner_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'delivery_partners', key: 'id' }, onDelete: 'CASCADE' },
      total_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      reference_number: { type: Sequelize.STRING(120), allowNull: false },
      status: { type: Sequelize.ENUM('pending', 'paid'), allowNull: false, defaultValue: 'paid' },
      period_start: { type: Sequelize.DATEONLY, allowNull: false },
      period_end: { type: Sequelize.DATEONLY, allowNull: false },
      paid_at: { type: Sequelize.DATE, allowNull: true },
      processed_by: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      ...timestamps,
    });

    await queryInterface.createTable('delivery_earnings', {
      id: idCol,
      delivery_partner_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'delivery_partners', key: 'id' }, onDelete: 'CASCADE' },
      delivery_assignment_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'delivery_assignments', key: 'id' }, onDelete: 'CASCADE' },
      order_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'orders', key: 'id' }, onDelete: 'CASCADE' },
      amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      bonus_amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0.0 },
      status: { type: Sequelize.ENUM('pending', 'settled'), allowNull: false, defaultValue: 'pending' },
      settlement_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true, references: { model: 'delivery_settlements', key: 'id' }, onDelete: 'SET NULL' },
      earned_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      ...timestamps,
    });

    await queryInterface.createTable('banners', {
      id: idCol,
      title: { type: Sequelize.STRING(160), allowNull: false },
      subtitle: { type: Sequelize.STRING(255), allowNull: true },
      image_url: { type: Sequelize.STRING(500), allowNull: false },
      cta_text: { type: Sequelize.STRING(60), allowNull: true },
      cta_link: { type: Sequelize.STRING(255), allowNull: true },
      position: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'hero' },
      sort_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...timestamps,
    });

    await queryInterface.createTable('promotional_campaigns', {
      id: idCol,
      title: { type: Sequelize.STRING(160), allowNull: false },
      message: { type: Sequelize.STRING(300), allowNull: false },
      badge_text: { type: Sequelize.STRING(50), allowNull: true },
      link_url: { type: Sequelize.STRING(255), allowNull: true },
      starts_at: { type: Sequelize.DATE, allowNull: true },
      ends_at: { type: Sequelize.DATE, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...timestamps,
    });

    await queryInterface.createTable('newsletters', {
      id: idCol,
      email: { type: Sequelize.STRING(180), allowNull: false, unique: true },
      is_subscribed: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      subscribed_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      ...timestamps,
    });

    await queryInterface.createTable('notifications', {
      id: idCol,
      user_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      title: { type: Sequelize.STRING(160), allowNull: false },
      message: { type: Sequelize.TEXT, allowNull: false },
      category: { type: Sequelize.STRING(60), allowNull: false, defaultValue: 'system' },
      link_url: { type: Sequelize.STRING(255), allowNull: true },
      is_read: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      read_at: { type: Sequelize.DATE, allowNull: true },
      ...timestamps,
    });

    await queryInterface.createTable('support_tickets', {
      id: idCol,
      ticket_number: { type: Sequelize.STRING(40), allowNull: false, unique: true },
      user_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'users', key: 'id' } },
      order_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true, references: { model: 'orders', key: 'id' }, onDelete: 'SET NULL' },
      subject: { type: Sequelize.STRING(200), allowNull: false },
      category: { type: Sequelize.STRING(60), allowNull: false, defaultValue: 'general' },
      priority: { type: Sequelize.ENUM('low', 'medium', 'high'), allowNull: false, defaultValue: 'medium' },
      status: { type: Sequelize.ENUM('open', 'in_progress', 'resolved', 'closed'), allowNull: false, defaultValue: 'open' },
      assigned_to: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      ...timestamps,
    });

    await queryInterface.createTable('support_messages', {
      id: idCol,
      ticket_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'support_tickets', key: 'id' }, onDelete: 'CASCADE' },
      sender_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'users', key: 'id' } },
      message: { type: Sequelize.TEXT, allowNull: false },
      is_internal: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      ...timestamps,
    });

    await queryInterface.createTable('admin_audit_logs', {
      id: idCol,
      actor_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'users', key: 'id' } },
      action: { type: Sequelize.STRING(120), allowNull: false },
      entity_type: { type: Sequelize.STRING(80), allowNull: false },
      entity_id: { type: Sequelize.STRING(80), allowNull: true },
      old_values_json: { type: Sequelize.JSON, allowNull: true },
      new_values_json: { type: Sequelize.JSON, allowNull: true },
      ip_address: { type: Sequelize.STRING(64), allowNull: true },
      ...timestamps,
    });

    await queryInterface.createTable('system_settings', {
      id: idCol,
      setting_key: { type: Sequelize.STRING(120), allowNull: false, unique: true },
      setting_value: { type: Sequelize.TEXT, allowNull: false },
      group_name: { type: Sequelize.STRING(60), allowNull: false, defaultValue: 'general' },
      is_public: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      description: { type: Sequelize.STRING(255), allowNull: true },
      ...timestamps,
    });
  },

  async down(queryInterface) {
    const tables = [
      'system_settings', 'admin_audit_logs', 'support_messages', 'support_tickets', 'notifications',
      'newsletters', 'promotional_campaigns', 'banners', 'delivery_earnings', 'delivery_settlements',
      'courier_tracking_events', 'courier_shipments', 'return_pickups', 'delivery_proofs',
      'delivery_location_history', 'delivery_partner_current_locations', 'delivery_status_history',
      'delivery_assignments', 'delivery_zone_pincodes', 'delivery_zones', 'delivery_vehicles',
      'delivery_documents', 'delivery_partners',
    ];
    for (const table of tables) {
      await queryInterface.dropTable(table);
    }
  },
};
