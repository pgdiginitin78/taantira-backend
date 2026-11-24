const yup = require('yup');

const registerSchema = yup.object({
  full_name: yup.string().trim().min(2, 'Full name must be at least 2 characters').max(120).required('Full name is required'),
  email: yup.string().trim().lowercase().email('Enter a valid email address').required('Email is required'),
  phone: yup.string().trim().matches(/^[0-9+\-\s]{8,15}$/, 'Enter a valid phone number').required('Phone number is required'),
  password: yup.string().min(8, 'Password must be at least 8 characters').max(72).required('Password is required'),
});

const loginSchema = yup.object({
  email: yup.string().trim().lowercase().email('Enter a valid email address').required('Email is required'),
  password: yup.string().required('Password is required'),
});

const updateProfileSchema = yup.object({
  full_name: yup.string().trim().min(2).max(120).required('Full name is required'),
  phone: yup.string().trim().matches(/^[0-9+\-\s]{8,15}$/, 'Enter a valid phone number').nullable(),
  date_of_birth: yup.string().nullable(),
  preferred_size: yup.string().trim().max(20).nullable(),
  marketing_opt_in: yup.boolean().default(true),
});

const addressSchema = yup.object({
  label: yup.string().trim().max(40).default('Home'),
  recipient_name: yup.string().trim().min(2).max(120).required('Recipient name is required'),
  phone: yup.string().trim().matches(/^[0-9+\-\s]{8,15}$/, 'Enter a valid phone number').required('Phone is required'),
  address_line1: yup.string().trim().min(5).max(255).required('Address line 1 is required'),
  address_line2: yup.string().trim().max(255).nullable(),
  landmark: yup.string().trim().max(150).nullable(),
  city: yup.string().trim().min(2).max(100).required('City is required'),
  state: yup.string().trim().min(2).max(100).required('State is required'),
  pincode: yup.string().trim().matches(/^\d{6}$/, 'Enter a valid 6-digit PIN code').required('PIN code is required'),
  country: yup.string().trim().default('India'),
  latitude: yup.number().min(-90).max(90).nullable(),
  longitude: yup.number().min(-180).max(180).nullable(),
  is_default: yup.boolean().default(false),
});

module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  addressSchema,
};
