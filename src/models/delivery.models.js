const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DeliveryPartner = sequelize.define(
    'DeliveryPartner',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, unique: true },
      partner_code: { type: DataTypes.STRING(40), allowNull: false, unique: true },
      address: { type: DataTypes.STRING(255), allowNull: false },
      city: { type: DataTypes.STRING(100), allowNull: false },
      state: { type: DataTypes.STRING(100), allowNull: false },
      pincode: { type: DataTypes.STRING(12), allowNull: false },
      service_pincodes_json: { type: DataTypes.JSON, allowNull: true },
      profile_photo_url: { type: DataTypes.STRING(500), allowNull: true },
      approval_status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'suspended'),
        allowNull: false,
        defaultValue: 'pending',
      },
      is_online: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      current_availability: {
        type: DataTypes.ENUM('offline', 'available', 'on_delivery'),
        allowNull: false,
        defaultValue: 'offline',
      },
      invited_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      approved_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      approved_at: { type: DataTypes.DATE, allowNull: true },
      rejection_reason: { type: DataTypes.STRING(255), allowNull: true },
    },
    { tableName: 'delivery_partners' }
  );

  const DeliveryDocument = sequelize.define(
    'DeliveryDocument',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      delivery_partner_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      doc_type: { type: DataTypes.STRING(60), allowNull: false },
      doc_number_masked: { type: DataTypes.STRING(60), allowNull: false },
      document_url: { type: DataTypes.STRING(500), allowNull: true },
      media_file_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      verification_status: {
        type: DataTypes.ENUM('pending', 'verified', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
      },
      verified_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      verified_at: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: 'delivery_documents' }
  );

  const DeliveryVehicle = sequelize.define(
    'DeliveryVehicle',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      delivery_partner_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      vehicle_type: { type: DataTypes.STRING(40), allowNull: false },
      vehicle_number: { type: DataTypes.STRING(40), allowNull: false },
      model_name: { type: DataTypes.STRING(80), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'delivery_vehicles' }
  );

  const DeliveryZone = sequelize.define(
    'DeliveryZone',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(120), allowNull: false },
      city: { type: DataTypes.STRING(100), allowNull: false },
      state: { type: DataTypes.STRING(100), allowNull: false },
      base_fee: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 99.0 },
      per_order_payout: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 65.0 },
      estimated_hours: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 24 },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'delivery_zones' }
  );

  const DeliveryZonePincode = sequelize.define(
    'DeliveryZonePincode',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      delivery_zone_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      pincode: { type: DataTypes.STRING(12), allowNull: false, unique: true },
      is_serviceable: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      cod_available: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'delivery_zone_pincodes' }
  );

  const DeliveryAssignment = sequelize.define(
    'DeliveryAssignment',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      order_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      delivery_partner_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      status: {
        type: DataTypes.ENUM(
          'assigned',
          'accepted',
          'rejected',
          'picked_up',
          'out_for_delivery',
          'delivered',
          'failed',
          'rto'
        ),
        allowNull: false,
        defaultValue: 'assigned',
      },
      assigned_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      assigned_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      accepted_at: { type: DataTypes.DATE, allowNull: true },
      picked_up_at: { type: DataTypes.DATE, allowNull: true },
      out_for_delivery_at: { type: DataTypes.DATE, allowNull: true },
      delivered_at: { type: DataTypes.DATE, allowNull: true },
      rejection_reason: { type: DataTypes.STRING(255), allowNull: true },
    },
    { tableName: 'delivery_assignments' }
  );

  const DeliveryStatusHistory = sequelize.define(
    'DeliveryStatusHistory',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      delivery_assignment_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      status: { type: DataTypes.STRING(40), allowNull: false },
      note: { type: DataTypes.STRING(255), allowNull: true },
      changed_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    },
    { tableName: 'delivery_status_history' }
  );

  const DeliveryPartnerCurrentLocation = sequelize.define(
    'DeliveryPartnerCurrentLocation',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      delivery_partner_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, unique: true },
      delivery_assignment_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: false },
      longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: false },
      accuracy_meters: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
      speed_mps: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
      heading: { type: DataTypes.DECIMAL(6, 2), allowNull: true },
      recorded_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    { tableName: 'delivery_partner_current_locations' }
  );

  const DeliveryLocationHistory = sequelize.define(
    'DeliveryLocationHistory',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      delivery_partner_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      delivery_assignment_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: false },
      longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: false },
      accuracy_meters: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
      recorded_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    { tableName: 'delivery_location_history' }
  );

  const DeliveryProof = sequelize.define(
    'DeliveryProof',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      delivery_assignment_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, unique: true },
      order_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      otp_verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      recipient_name: { type: DataTypes.STRING(120), allowNull: true },
      note: { type: DataTypes.STRING(255), allowNull: true },
      proof_image_url: { type: DataTypes.STRING(500), allowNull: true },
      media_file_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      delivered_latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
      delivered_longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
      captured_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    { tableName: 'delivery_proofs' }
  );

  const CourierShipment = sequelize.define(
    'CourierShipment',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      order_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, unique: true },
      courier_company: { type: DataTypes.STRING(120), allowNull: false },
      awb_number: { type: DataTypes.STRING(80), allowNull: false },
      tracking_url: { type: DataTypes.STRING(500), allowNull: true },
      pickup_date: { type: DataTypes.DATEONLY, allowNull: true },
      shipment_status: { type: DataTypes.STRING(60), allowNull: false, defaultValue: 'booked' },
      estimated_delivery_date: { type: DataTypes.DATEONLY, allowNull: true },
      notes: { type: DataTypes.STRING(255), allowNull: true },
      created_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    },
    { tableName: 'courier_shipments' }
  );

  const CourierTrackingEvent = sequelize.define(
    'CourierTrackingEvent',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      courier_shipment_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      status: { type: DataTypes.STRING(80), allowNull: false },
      location: { type: DataTypes.STRING(120), allowNull: true },
      description: { type: DataTypes.STRING(255), allowNull: false },
      event_time: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    },
    { tableName: 'courier_tracking_events' }
  );

  const DeliveryEarning = sequelize.define(
    'DeliveryEarning',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      delivery_partner_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      delivery_assignment_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      order_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      bonus_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.0 },
      status: { type: DataTypes.ENUM('pending', 'settled'), allowNull: false, defaultValue: 'pending' },
      settlement_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      earned_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    { tableName: 'delivery_earnings' }
  );

  const DeliverySettlement = sequelize.define(
    'DeliverySettlement',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      delivery_partner_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      total_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      reference_number: { type: DataTypes.STRING(120), allowNull: false },
      status: { type: DataTypes.ENUM('pending', 'paid'), allowNull: false, defaultValue: 'paid' },
      period_start: { type: DataTypes.DATEONLY, allowNull: false },
      period_end: { type: DataTypes.DATEONLY, allowNull: false },
      paid_at: { type: DataTypes.DATE, allowNull: true },
      processed_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    },
    { tableName: 'delivery_settlements' }
  );

  return {
    DeliveryPartner,
    DeliveryDocument,
    DeliveryVehicle,
    DeliveryZone,
    DeliveryZonePincode,
    DeliveryAssignment,
    DeliveryStatusHistory,
    DeliveryPartnerCurrentLocation,
    DeliveryLocationHistory,
    DeliveryProof,
    CourierShipment,
    CourierTrackingEvent,
    DeliveryEarning,
    DeliverySettlement,
  };
};
