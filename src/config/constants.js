const ROLES = {
  CUSTOMER: 'customer',
  DELIVERY_PARTNER: 'delivery_partner',
  SUPER_ADMIN: 'super_admin',
  CATALOGUE_MANAGER: 'catalogue_manager',
  ORDER_MANAGER: 'order_manager',
  INVENTORY_MANAGER: 'inventory_manager',
  FINANCE_MANAGER: 'finance_manager',
  MARKETING_MANAGER: 'marketing_manager',
  DELIVERY_MANAGER: 'delivery_manager',
  SUPPORT_AGENT: 'customer_support_agent',
};

const ADMIN_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.CATALOGUE_MANAGER,
  ROLES.ORDER_MANAGER,
  ROLES.INVENTORY_MANAGER,
  ROLES.FINANCE_MANAGER,
  ROLES.MARKETING_MANAGER,
  ROLES.DELIVERY_MANAGER,
  ROLES.SUPPORT_AGENT,
];

const ORDER_STATUSES = [
  'new',
  'processing',
  'packing',
  'ready_for_pickup',
  'shipped',
  'delivered',
  'cancelled',
  'failed',
  'returned',
];

const PAYMENT_METHODS = ['cod', 'manual_upi'];

const PAYMENT_STATUSES = [
  'pending',
  'awaiting_verification',
  'paid',
  'failed',
  'refunded',
  'partially_refunded',
  'cancelled',
];

const DELIVERY_ASSIGNMENT_STATUSES = [
  'assigned',
  'accepted',
  'rejected',
  'picked_up',
  'out_for_delivery',
  'delivered',
  'failed',
  'rto',
];

const STALE_LOCATION_THRESHOLD_SECONDS = 120;

module.exports = {
  ROLES,
  ADMIN_ROLES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  DELIVERY_ASSIGNMENT_STATUSES,
  STALE_LOCATION_THRESHOLD_SECONDS,
};
