const yup = require('yup');

const categorySchema = yup.object({
  name: yup.string().trim().min(2).max(120).required('Category name is required'),
  slug: yup.string().trim().lowercase().matches(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens').required('Slug is required'),
  parent_id: yup.number().integer().positive().nullable(),
  description: yup.string().nullable(),
  image_url: yup.string().max(500).nullable(),
  sort_order: yup.number().integer().default(0),
  is_active: yup.boolean().default(true),
  supports_blouse_option: yup.boolean().default(false),
  supports_petticoat_option: yup.boolean().default(false),
  supports_customisation: yup.boolean().default(false),
  supports_gift_options: yup.boolean().default(true),
});

const collectionSchema = yup.object({
  name: yup.string().trim().min(2).max(140).required('Collection name is required'),
  slug: yup.string().trim().lowercase().matches(/^[a-z0-9-]+$/).required('Slug is required'),
  subtitle: yup.string().max(255).nullable(),
  description: yup.string().nullable(),
  banner_image_url: yup.string().max(500).nullable(),
  is_active: yup.boolean().default(true),
  sort_order: yup.number().integer().default(0),
});

const galleryImageItemSchema = yup.object({
  angle_key: yup.string().oneOf(['front', 'back', 'side', 'border', 'weave']).optional(),
  sort_order: yup.number().integer().min(1).max(5).required(),
  image_url: yup.string().trim().max(500).required(),
  alt_text: yup.string().trim().max(255).nullable(),
});

const productSchema = yup.object({
  name: yup.string().trim().min(3).max(200).required('Product name is required'),
  slug: yup.string().trim().lowercase().matches(/^[a-z0-9-]+$/).required('Slug is required'),
  sku: yup.string().trim().min(3).max(80).required('SKU is required'),
  primary_category_id: yup.number().integer().positive().required('Primary category is required'),
  short_description: yup.string().max(500).nullable(),
  description: yup.string().min(5, 'Enter at least 5 characters').required('Description is required'),
  story: yup.string().nullable(),
  base_price: yup.number().positive('Base price must be greater than zero').required('Base price is required'),
  sale_price: yup.number().positive().nullable(),
  tax_rate: yup.number().min(0).max(28).default(5),
  fabric: yup.string().trim().required('Fabric information is required'),
  occasion: yup.string().trim().default('Handloom & Festive'),
  length_width: yup.string().max(180).nullable(),
  wash_care: yup.string().max(255).nullable(),
  manufacturing_info: yup.string().max(255).nullable(),
  country_of_origin: yup.string().default('India'),
  return_policy: yup.string().default('7-day easy return on uncustomized sarees.'),
  is_featured: yup.boolean().default(false),
  is_new_arrival: yup.boolean().default(false),
  is_best_seller: yup.boolean().default(false),
  is_trending: yup.boolean().default(false),
  is_active: yup.boolean().default(true),
  image_url: yup.string().max(500).nullable(),
  gallery_images: yup.array().of(galleryImageItemSchema).max(5).optional(),
  variants: yup.array().of(
    yup.object({
      sku: yup.string().required('Variant SKU is required'),
      size: yup.string().required('Size is required'),
      color_name: yup.string().required('Color name is required'),
      color_hex: yup.string().matches(/^#[0-9A-Fa-f]{6}$/, 'Valid hex color required').required('Color hex is required'),
      price_override: yup.number().positive().nullable(),
      stock_qty: yup.number().integer().min(0).default(0),
      low_stock_threshold: yup.number().integer().min(0).default(5),
    })
  ).optional(),
});

const productUpdateSchema = yup.object({
  name: yup.string().trim().min(3).max(200).optional(),
  slug: yup.string().trim().lowercase().matches(/^[a-z0-9-]+$/).optional(),
  sku: yup.string().trim().min(3).max(80).optional(),
  primary_category_id: yup.number().integer().positive().optional(),
  short_description: yup.string().max(500).nullable(),
  description: yup.string().min(5).optional(),
  base_price: yup.number().positive().optional(),
  sale_price: yup.number().positive().nullable(),
  fabric: yup.string().trim().optional(),
  occasion: yup.string().trim().optional(),
  length_width: yup.string().max(180).nullable(),
  wash_care: yup.string().max(255).nullable(),
  is_featured: yup.boolean().optional(),
  is_new_arrival: yup.boolean().optional(),
  is_trending: yup.boolean().optional(),
  is_active: yup.boolean().optional(),
  stock_qty: yup.number().integer().min(0).optional(),
  image_url: yup.string().max(500).nullable(),
  gallery_images: yup.array().of(galleryImageItemSchema).max(5).optional(),
});

const variantSchema = yup.object({
  sku: yup.string().trim().required('SKU is required'),
  size: yup.string().trim().required('Size is required'),
  color_name: yup.string().trim().required('Color name is required'),
  color_hex: yup.string().matches(/^#[0-9A-Fa-f]{6}$/, 'Valid hex color required').required('Color hex is required'),
  price_override: yup.number().positive().nullable(),
  stock_qty: yup.number().integer().min(0).required('Stock quantity is required'),
  low_stock_threshold: yup.number().integer().min(0).default(5),
  is_active: yup.boolean().default(true),
});

const stockAdjustSchema = yup.object({
  warehouse_id: yup.number().integer().positive().required('Warehouse is required'),
  variant_id: yup.number().integer().positive().required('Variant is required'),
  movement_type: yup.string().oneOf(['purchase', 'adjustment', 'return', 'rto']).required('Movement type is required'),
  quantity_delta: yup.number().integer().notOneOf([0], 'Quantity delta cannot be zero').required('Quantity delta is required'),
  notes: yup.string().max(255).nullable(),
});

const reviewSchema = yup.object({
  product_id: yup.number().integer().positive().required(),
  rating: yup.number().integer().min(1).max(5).required('Rating 1-5 is required'),
  title: yup.string().trim().max(150).nullable(),
  comment: yup.string().trim().min(5, 'Review comment must be at least 5 characters').required('Comment is required'),
});

const questionSchema = yup.object({
  question: yup.string().trim().min(5).max(600).required('Question is required'),
});

const answerSchema = yup.object({
  answer: yup.string().trim().min(3).max(1000).required('Answer is required'),
});

module.exports = {
  categorySchema,
  collectionSchema,
  productSchema,
  productUpdateSchema,
  variantSchema,
  stockAdjustSchema,
  reviewSchema,
  questionSchema,
  answerSchema,
};
