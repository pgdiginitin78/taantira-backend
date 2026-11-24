const yup = require('yup');

const partnerRegisterSchema = yup.object({
  full_name: yup.string().trim().min(2).max(120).required('Full name is required'),
  email: yup.string().trim().lowercase().email('Valid email required').required('Email is required'),
  phone: yup.string().trim().matches(/^[0-9+\-\s]{8,15}$/, 'Valid phone required').required('Phone is required'),
  password: yup.string().min(8, 'Password must be at least 8 characters').required('Password is required'),
  address: yup.string().trim().min(5).max(255).required('Address is required'),
  city: yup.string().trim().min(2).max(100).required('City is required'),
  state: yup.string().trim().min(2).max(100).required('State is required'),
  pincode: yup.string().trim().matches(/^\d{6}$/, '6-digit PIN code required').required('PIN code is required'),
  service_pincodes: yup.array().of(yup.string().matches(/^\d{6}$/)).min(1, 'At least one serviceable PIN code is required').required(),
  vehicle_type: yup.string().trim().required('Vehicle type is required'),
  vehicle_number: yup.string().trim().min(4).max(40).required('Vehicle number is required'),
  model_name: yup.string().trim().max(80).nullable(),
  doc_type: yup.string().trim().required('Verification document type is required'),
  doc_number_masked: yup.string().trim().min(4).max(60).required('Document reference is required'),
});

const partnerVerifySchema = yup.object({
  approval_status: yup.string().oneOf(['approved', 'rejected', 'suspended']).required(),
  rejection_reason: yup.string().max(255).nullable(),
});

const partnerAvailabilitySchema = yup.object({
  is_online: yup.boolean().required(),
});

const assignPartnerSchema = yup.object({
  order_id: yup.number().integer().positive().required('Order ID is required'),
  delivery_partner_id: yup.number().integer().positive().required('Delivery partner ID is required'),
});

const assignmentRespondSchema = yup.object({
  action: yup.string().oneOf(['accept', 'reject']).required(),
  rejection_reason: yup.string().max(255).nullable(),
});

const locationUpdateSchema = yup.object({
  delivery_assignment_id: yup.number().integer().positive().nullable(),
  latitude: yup.number().min(-90).max(90).required('Latitude is required'),
  longitude: yup.number().min(-180).max(180).required('Longitude is required'),
  accuracy_meters: yup.number().min(0).nullable(),
  speed_mps: yup.number().min(0).nullable(),
  heading: yup.number().min(0).max(360).nullable(),
});

const completeDeliveryOtpSchema = yup.object({
  otp: yup.string().trim().matches(/^\d{6}$/, 'Enter the 6-digit customer OTP').required('Customer OTP is required'),
  recipient_name: yup.string().trim().max(120).nullable(),
  note: yup.string().trim().max(255).nullable(),
  delivered_latitude: yup.number().min(-90).max(90).nullable(),
  delivered_longitude: yup.number().min(-180).max(180).nullable(),
  cod_collected: yup.boolean().default(false),
});

const deliveryZoneSchema = yup.object({
  name: yup.string().trim().required('Zone name is required'),
  city: yup.string().trim().required('City is required'),
  state: yup.string().trim().required('State is required'),
  base_fee: yup.number().min(0).default(99),
  per_order_payout: yup.number().min(0).default(65),
  estimated_hours: yup.number().integer().min(1).default(24),
  pincodes: yup.array().of(yup.string().matches(/^\d{6}$/)).min(1).required(),
  cod_available: yup.boolean().default(true),
});

const courierBookSchema = yup.object({
  order_id: yup.number().integer().positive().required('Order ID is required'),
  courier_company: yup.string().trim().min(2).max(120).required('Courier company name is required'),
  awb_number: yup.string().trim().min(4).max(80).required('AWB number is required'),
  tracking_url: yup.string().url('Enter a valid tracking URL').nullable(),
  pickup_date: yup.string().nullable(),
  estimated_delivery_date: yup.string().nullable(),
  notes: yup.string().max(255).nullable(),
});

const courierEventSchema = yup.object({
  status: yup.string().trim().required('Milestone status is required'),
  location: yup.string().trim().max(120).nullable(),
  description: yup.string().trim().required('Milestone description is required'),
  customer_order_status: yup.string().oneOf(['shipped', 'delivered', 'returned']).optional(),
});

const supportTicketSchema = yup.object({
  order_id: yup.number().integer().positive().nullable(),
  subject: yup.string().trim().min(4).max(200).required('Subject is required'),
  category: yup.string().trim().default('general'),
  priority: yup.string().oneOf(['low', 'medium', 'high']).default('medium'),
  message: yup.string().trim().min(5).required('Message is required'),
});

const supportReplySchema = yup.object({
  message: yup.string().trim().min(2).required('Reply message is required'),
  status: yup.string().oneOf(['open', 'in_progress', 'resolved', 'closed']).optional(),
  is_internal: yup.boolean().default(false),
});

const newsletterSchema = yup.object({
  email: yup.string().trim().lowercase().email('Valid email required').required('Email is required'),
});

const settlementSchema = yup.object({
  delivery_partner_id: yup.number().integer().positive().required(),
  reference_number: yup.string().trim().min(3).max(120).required('Settlement reference number is required'),
  period_start: yup.string().required('Period start required'),
  period_end: yup.string().required('Period end required'),
});

module.exports = {
  partnerRegisterSchema,
  partnerVerifySchema,
  partnerAvailabilitySchema,
  assignPartnerSchema,
  assignmentRespondSchema,
  locationUpdateSchema,
  completeDeliveryOtpSchema,
  deliveryZoneSchema,
  courierBookSchema,
  courierEventSchema,
  supportTicketSchema,
  supportReplySchema,
  newsletterSchema,
  settlementSchema,
};
