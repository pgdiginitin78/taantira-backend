const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Banner = sequelize.define(
    'Banner',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      title: { type: DataTypes.STRING(160), allowNull: false },
      subtitle: { type: DataTypes.STRING(255), allowNull: true },
      image_url: { type: DataTypes.STRING(500), allowNull: false },
      cta_text: { type: DataTypes.STRING(60), allowNull: true },
      cta_link: { type: DataTypes.STRING(255), allowNull: true },
      position: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'hero' },
      sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'banners' }
  );

  const PromotionalCampaign = sequelize.define(
    'PromotionalCampaign',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      title: { type: DataTypes.STRING(160), allowNull: false },
      message: { type: DataTypes.STRING(300), allowNull: false },
      badge_text: { type: DataTypes.STRING(50), allowNull: true },
      link_url: { type: DataTypes.STRING(255), allowNull: true },
      starts_at: { type: DataTypes.DATE, allowNull: true },
      ends_at: { type: DataTypes.DATE, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'promotional_campaigns' }
  );

  const Newsletter = sequelize.define(
    'Newsletter',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      email: { type: DataTypes.STRING(180), allowNull: false, unique: true },
      is_subscribed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      subscribed_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    { tableName: 'newsletters' }
  );

  const Notification = sequelize.define(
    'Notification',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      title: { type: DataTypes.STRING(160), allowNull: false },
      message: { type: DataTypes.TEXT, allowNull: false },
      category: { type: DataTypes.STRING(60), allowNull: false, defaultValue: 'system' },
      link_url: { type: DataTypes.STRING(255), allowNull: true },
      is_read: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      read_at: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: 'notifications' }
  );

  const SupportTicket = sequelize.define(
    'SupportTicket',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      ticket_number: { type: DataTypes.STRING(40), allowNull: false, unique: true },
      user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      order_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      subject: { type: DataTypes.STRING(200), allowNull: false },
      category: { type: DataTypes.STRING(60), allowNull: false, defaultValue: 'general' },
      priority: { type: DataTypes.ENUM('low', 'medium', 'high'), allowNull: false, defaultValue: 'medium' },
      status: {
        type: DataTypes.ENUM('open', 'in_progress', 'resolved', 'closed'),
        allowNull: false,
        defaultValue: 'open',
      },
      assigned_to: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    },
    { tableName: 'support_tickets' }
  );

  const SupportMessage = sequelize.define(
    'SupportMessage',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      ticket_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      sender_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      message: { type: DataTypes.TEXT, allowNull: false },
      is_internal: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    { tableName: 'support_messages' }
  );

  const AdminAuditLog = sequelize.define(
    'AdminAuditLog',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      actor_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      action: { type: DataTypes.STRING(120), allowNull: false },
      entity_type: { type: DataTypes.STRING(80), allowNull: false },
      entity_id: { type: DataTypes.STRING(80), allowNull: true },
      old_values_json: { type: DataTypes.JSON, allowNull: true },
      new_values_json: { type: DataTypes.JSON, allowNull: true },
      ip_address: { type: DataTypes.STRING(64), allowNull: true },
    },
    { tableName: 'admin_audit_logs' }
  );

  const SystemSetting = sequelize.define(
    'SystemSetting',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      setting_key: { type: DataTypes.STRING(120), allowNull: false, unique: true },
      setting_value: { type: DataTypes.TEXT, allowNull: false },
      group_name: { type: DataTypes.STRING(60), allowNull: false, defaultValue: 'general' },
      is_public: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      description: { type: DataTypes.STRING(255), allowNull: true },
    },
    { tableName: 'system_settings' }
  );

  const MediaFile = sequelize.define(
    'MediaFile',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      filename: { type: DataTypes.STRING(200), allowNull: false },
      mime_type: { type: DataTypes.STRING(80), allowNull: false },
      size_bytes: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      data: { type: DataTypes.BLOB('long'), allowNull: false },
      uploaded_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    },
    { tableName: 'media_files' }
  );

  return {
    Banner,
    PromotionalCampaign,
    Newsletter,
    Notification,
    SupportTicket,
    SupportMessage,
    AdminAuditLog,
    SystemSetting,
    MediaFile,
  };
};
