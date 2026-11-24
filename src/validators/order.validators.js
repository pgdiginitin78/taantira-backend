const yup = require('yup');
const { ORDER_STATUSES } = require('../config/constants');

const cartItemAddSchema = yup.object({
  product_id: yup.number().integer().positive().required('Product ID is required'),
  variant_id: yup.number().integer().positive().required('Variant ID is required'),
  quantity: yup.number().integer().min(1).max(20).default(1),
  custom_options: yup.object({
    matching_blouse: yup.boolean().default(false),
    blouse_stitching_notes: yup.string().max(200).nullable(),
    petticoat: yup.boolean().default(false),
    gift_wrap: yup.boolean().default(false),
    gift_box: yup.boolean().default(false),
    tote_bag: yup.boolean().default(false),
    customisation_notes: yup.string().max(250).nullable(),
  }).nullable(),
});

const cartItemUpdateSchema = yup.object({
  quantity: yup.number().integer().min(1).max(20).required('Quantity is required'),
});

const couponApplySchema = yup.object({
  code: yup.string().trim().uppercase().min(3).max(50).required('Coupon code is required'),
});

const couponCreateSchema = yup.object({
  code: yup.string().trim().uppercase().min(3).max(50).required('Coupon code is required'),
  description: yup.string().max(255).nullable(),
  discount_type: yup.string().oneOf(['percentage', 'fixed']).required('Discount type is required'),
  discount_value: yup.number().positive('Discount value must be positive').required('Discount value is required'),
  min_purchase_amount: yup.number().min(0).default(0),
  max_discount_amount: yup.number().positive().nullable(),
  starts_at: yup.date().required('Start date is required'),
  expires_at: yup.date().min(yup.ref('starts_at'), 'Expiry date must be after start date').required('Expiry date is required'),
  usage_limit: yup.number().integer().positive().nullable(),
  per_customer_limit: yup.number().integer().min(1).default(1),
  is_active: yup.boolean().default(true),
  product_ids: yup.array().of(yup.number().integer().positive()).optional(),
  category_ids: yup.array().of(yup.number().integer().positive()).optional(),
});

const checkoutSchema = yup.object({
  customer_name: yup.string().trim().min(2).max(120).required('Customer name is required'),
  customer_email: yup.string().trim().email().required('Email is required'),
  customer_phone: yup.string().trim().matches(/^[0-9+\-\s]{8,15}$/, 'Valid phone required').required('Phone is required'),
  address_id: yup.number().integer().positive().nullable(),
  shipping_address: yup.object({
    recipient_name: yup.string().trim().min(2).required('Recipient name is required'),
    phone: yup.string().trim().matches(/^[0-9+\-\s]{8,15}$/, 'Valid phone required').required('Phone is required'),
    address_line1: yup.string().trim().min(5).required('Address line 1 is required'),
    address_line2: yup.string().trim().nullable(),
    landmark: yup.string().trim().nullable(),
    city: yup.string().trim().required('City is required'),
    state: yup.string().trim().required('State is required'),
    pincode: yup.string().trim().matches(/^\d{6}$/, 'Valid 6-digit PIN code is required').required('PIN code is required'),
    country: yup.string().default('India'),
    latitude: yup.number().min(-90).max(90).nullable(),
    longitude: yup.number().min(-180).max(180).nullable(),
  }).required('Shipping address is required'),
  delivery_mode: yup.string().oneOf(['own_partner', 'third_party_courier']).required('Delivery method is required'),
  payment_method: yup.string().oneOf(['cod', 'manual_upi']).required('Payment method is required'),
  upi_utr: yup.string().trim().max(80).nullable(),
  coupon_code: yup.string().trim().uppercase().nullable(),
  notes: yup.string().max(500).nullable(),
});

const orderStatusSchema = yup.object({
  status: yup.string().oneOf(ORDER_STATUSES).required('Valid order status is required'),
  note: yup.string().max(255).nullable(),
});

const cancellationSchema = yup.object({
  reason: yup.string().trim().min(3).max(160).required('Cancellation reason is required'),
  details: yup.string().max(600).nullable(),
});

const upiSubmitSchema = yup.object({
  utr_number: yup.string().trim().min(6, 'UTR / Reference number must be at least 6 characters').max(80).required('UTR number is required'),
});

const paymentVerifySchema = yup.object({
  decision: yup.string().oneOf(['paid', 'failed']).required('Verification decision is required'),
  verification_note: yup.string().max(255).nullable(),
  received_amount: yup.number().min(0).optional(),
});

const refundSchema = yup.object({
  order_id: yup.number().integer().positive().required('Order ID is required'),
  amount: yup.number().positive('Refund amount must be greater than zero').required('Amount is required'),
  refund_type: yup.string().oneOf(['full', 'partial']).default('full'),
  reason: yup.string().trim().min(3).max(255).required('Refund reason is required'),
  reference_number: yup.string().max(120).nullable(),
});

const returnRequestSchema = yup.object({
  order_id: yup.number().integer().positive().required('Order ID is required'),
  request_type: yup.string().oneOf(['return', 'exchange']).default('return'),
  reason: yup.string().trim().min(3).max(180).required('Return reason is required'),
  details: yup.string().max(800).nullable(),
  items: yup.array().of(
    yup.object({
      order_item_id: yup.number().integer().positive().required(),
      quantity: yup.number().integer().min(1).required(),
      condition_note: yup.string().max(255).nullable(),
    })
  ).min(1, 'Select at least one item').required(),
  exchange_variant_id: yup.number().integer().positive().nullable(),
});

const returnDecisionSchema = yup.object({
  status: yup.string().oneOf(['approved', 'pickup_scheduled', 'picked_up', 'completed', 'rejected']).required(),
  admin_notes: yup.string().max(255).nullable(),
  delivery_partner_id: yup.number().integer().positive().nullable(),
  scheduled_date: yup.string().nullable(),
});

module.exports = {
  cartItemAddSchema,
  cartItemUpdateSchema,
  couponApplySchema,
  couponCreateSchema,
  checkoutSchema,
  orderStatusSchema,
  cancellationSchema,
  upiSubmitSchema,
  paymentVerifySchema,
  refundSchema,
  returnRequestSchema,
  returnDecisionSchema,
};
