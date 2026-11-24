const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Category = sequelize.define(
    'Category',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(120), allowNull: false },
      slug: { type: DataTypes.STRING(140), allowNull: false, unique: true },
      parent_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      description: { type: DataTypes.TEXT, allowNull: true },
      image_url: { type: DataTypes.STRING(500), allowNull: true },
      sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      supports_blouse_option: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      supports_petticoat_option: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      supports_customisation: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      supports_gift_options: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'categories' }
  );

  const Product = sequelize.define(
    'Product',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(200), allowNull: false },
      slug: { type: DataTypes.STRING(220), allowNull: false, unique: true },
      sku: { type: DataTypes.STRING(80), allowNull: false, unique: true },
      primary_category_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      short_description: { type: DataTypes.STRING(500), allowNull: true },
      description: { type: DataTypes.TEXT, allowNull: false },
      story: { type: DataTypes.TEXT, allowNull: true },
      base_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      sale_price: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
      tax_rate: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 12.0 },
      fabric: { type: DataTypes.STRING(120), allowNull: false },
      occasion: { type: DataTypes.STRING(120), allowNull: false },
      length_width: { type: DataTypes.STRING(180), allowNull: true },
      wash_care: { type: DataTypes.STRING(255), allowNull: true },
      manufacturing_info: { type: DataTypes.STRING(255), allowNull: true },
      country_of_origin: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'India' },
      return_policy: { type: DataTypes.STRING(255), allowNull: false, defaultValue: '7-day easy return & size exchange' },
      is_featured: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      is_new_arrival: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      is_best_seller: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      is_trending: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      rating_avg: { type: DataTypes.DECIMAL(3, 2), allowNull: false, defaultValue: 0.0 },
      review_count: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      matching_product_ids_json: { type: DataTypes.JSON, allowNull: true },
    },
    { tableName: 'products' }
  );

  const ProductCategory = sequelize.define(
    'ProductCategory',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      product_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      category_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    },
    { tableName: 'product_categories' }
  );

  const Collection = sequelize.define(
    'Collection',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(140), allowNull: false },
      slug: { type: DataTypes.STRING(160), allowNull: false, unique: true },
      subtitle: { type: DataTypes.STRING(255), allowNull: true },
      description: { type: DataTypes.TEXT, allowNull: true },
      banner_image_url: { type: DataTypes.STRING(500), allowNull: true },
      starts_at: { type: DataTypes.DATE, allowNull: true },
      ends_at: { type: DataTypes.DATE, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    { tableName: 'collections' }
  );

  const CollectionProduct = sequelize.define(
    'CollectionProduct',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      collection_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      product_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    { tableName: 'collection_products' }
  );

  const ProductImage = sequelize.define(
    'ProductImage',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      product_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      variant_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      image_url: { type: DataTypes.STRING(500), allowNull: false },
      media_file_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      alt_text: { type: DataTypes.STRING(255), allowNull: true },
      is_primary: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    { tableName: 'product_images' }
  );

  const ProductVariant = sequelize.define(
    'ProductVariant',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      product_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      sku: { type: DataTypes.STRING(100), allowNull: false, unique: true },
      size: { type: DataTypes.STRING(40), allowNull: false },
      color_name: { type: DataTypes.STRING(60), allowNull: false },
      color_hex: { type: DataTypes.STRING(16), allowNull: false },
      price_override: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
      stock_qty: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      reserved_qty: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      low_stock_threshold: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'product_variants' }
  );

  const ProductAttribute = sequelize.define(
    'ProductAttribute',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(80), allowNull: false },
      slug: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    },
    { tableName: 'product_attributes' }
  );

  const AttributeValue = sequelize.define(
    'AttributeValue',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      attribute_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      product_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      value: { type: DataTypes.STRING(140), allowNull: false },
    },
    { tableName: 'attribute_values' }
  );

  const ProductReview = sequelize.define(
    'ProductReview',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      product_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      order_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      rating: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
      title: { type: DataTypes.STRING(150), allowNull: true },
      comment: { type: DataTypes.TEXT, allowNull: false },
      is_verified_purchase: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      is_approved: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'product_reviews' }
  );

  const ProductQuestion = sequelize.define(
    'ProductQuestion',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      product_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      question: { type: DataTypes.TEXT, allowNull: false },
      answer: { type: DataTypes.TEXT, allowNull: true },
      answered_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      answered_at: { type: DataTypes.DATE, allowNull: true },
      is_published: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'product_questions' }
  );

  return {
    Category,
    Product,
    ProductCategory,
    Collection,
    CollectionProduct,
    ProductImage,
    ProductVariant,
    ProductAttribute,
    AttributeValue,
    ProductReview,
    ProductQuestion,
  };
};
