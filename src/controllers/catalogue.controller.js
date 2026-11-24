const { Op } = require('sequelize');
const {
  sequelize,
  Product,
  Category,
  Collection,
  ProductImage,
  ProductVariant,
  ProductReview,
  ProductQuestion,
  User,
  Banner,
  PromotionalCampaign,
  OrderItem,
  Order,
  Warehouse,
  WarehouseStock,
} = require('../models');
const { recordAuditLog } = require('../middleware/audit');
const { getPublicSettingsMap } = require('../services/pricing.service');
const { sendSuccess } = require('../utils/response');
const { AppError } = require('../utils/errors');

const productIncludeList = [
  { model: Category, as: 'primaryCategory' },
  { model: ProductImage, as: 'images' },
  { model: ProductVariant, as: 'variants' },
  { model: Collection, as: 'collections', attributes: ['id', 'name', 'slug'], through: { attributes: [] } },
];

const getHomepage = async (req, res, next) => {
  try {
    const [banners, promos, categories, collections, products, reviews, settings] = await Promise.all([
      Banner.findAll({ where: { is_active: true }, order: [['sort_order', 'ASC']] }),
      PromotionalCampaign.findAll({ where: { is_active: true }, order: [['created_at', 'DESC']], limit: 3 }),
      Category.findAll({ where: { is_active: true }, order: [['sort_order', 'ASC']] }),
      Collection.findAll({ where: { is_active: true }, order: [['sort_order', 'ASC']] }),
      Product.findAll({
        where: { is_active: true },
        include: productIncludeList,
        order: [['created_at', 'DESC']],
      }),
      ProductReview.findAll({
        where: { is_approved: true },
        include: [
          { model: User, as: 'author', attributes: ['id', 'full_name'] },
          { model: Product, as: 'product', attributes: ['id', 'name', 'slug'] },
        ],
        order: [['created_at', 'DESC']],
        limit: 6,
      }),
      getPublicSettingsMap(),
    ]);

    const byCategory = (slug) =>
      products.filter((p) => p.primaryCategory?.slug === slug).slice(0, 4);

    return sendSuccess(res, {
      banners,
      promotional_bar: promos[0] || null,
      categories,
      collections,
      new_arrivals: products.filter((p) => p.is_new_arrival).slice(0, 6),
      best_sellers: products.filter((p) => p.is_best_seller).slice(0, 6),
      trending_products: products.filter((p) => p.is_trending).slice(0, 6),
      category_showcases: {
        sarees: byCategory('sarees'),
        dresses: byCategory('dresses'),
        kurtas: byCategory('kurtas'),
        suits: byCategory('suits'),
        lehengas: byCategory('lehengas'),
        accessories: byCategory('accessories'),
      },
      customer_reviews: reviews,
      store_settings: settings,
    });
  } catch (err) {
    return next(err);
  }
};

const searchSuggestions = async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return sendSuccess(res, { products: [], categories: [], collections: [] });

    const like = `%${q}%`;
    const [products, categories, collections] = await Promise.all([
      Product.findAll({
        where: {
          is_active: true,
          [Op.or]: [
            { name: { [Op.like]: like } },
            { fabric: { [Op.like]: like } },
            { occasion: { [Op.like]: like } },
            { sku: { [Op.like]: like } },
          ],
        },
        include: [
          { model: ProductImage, as: 'images', where: { is_primary: true }, required: false },
          { model: Category, as: 'primaryCategory', attributes: ['name', 'slug'] },
        ],
        limit: 6,
      }),
      Category.findAll({ where: { is_active: true, name: { [Op.like]: like } }, limit: 4 }),
      Collection.findAll({ where: { is_active: true, name: { [Op.like]: like } }, limit: 4 }),
    ]);

    return sendSuccess(res, { products, categories, collections });
  } catch (err) {
    return next(err);
  }
};

const listProducts = async (req, res, next) => {
  try {
    const {
      collection,
      category,
      q,
      minPrice,
      maxPrice,
      size,
      color,
      fabric,
      occasion,
      inStock,
      sort = 'newest',
      page = 1,
      limit = 12,
    } = req.query;

    const where = {};
    if (req.query.includeInactive !== 'true') {
      where.is_active = true;
    }

    if (q) {
      const like = `%${String(q).trim()}%`;
      where[Op.or] = [
        { name: { [Op.like]: like } },
        { fabric: { [Op.like]: like } },
        { occasion: { [Op.like]: like } },
        { sku: { [Op.like]: like } },
      ];
    }
    if (fabric) where.fabric = { [Op.like]: `%${fabric}%` };
    if (occasion) where.occasion = { [Op.like]: `%${occasion}%` };

    if (minPrice || maxPrice) {
      const priceRange = {};
      if (minPrice) priceRange[Op.gte] = Number(minPrice);
      if (maxPrice) priceRange[Op.lte] = Number(maxPrice);
      where[Op.and] = [
        ...(where[Op.and] || []),
        sequelize.where(sequelize.fn('COALESCE', sequelize.col('Product.sale_price'), sequelize.col('Product.base_price')), priceRange),
      ];
    }

    let orderClause = [['created_at', 'DESC']];
    if (sort === 'price_asc') {
      orderClause = [[sequelize.literal('COALESCE(Product.sale_price, Product.base_price)'), 'ASC']];
    } else if (sort === 'price_desc') {
      orderClause = [[sequelize.literal('COALESCE(Product.sale_price, Product.base_price)'), 'DESC']];
    } else if (sort === 'rating') {
      orderClause = [['rating_avg', 'DESC']];
    } else if (sort === 'bestselling') {
      orderClause = [['is_best_seller', 'DESC'], ['rating_avg', 'DESC']];
    }

    const categorySlug = category || (collection && !['all', 'new-arrivals', 'best-sellers', 'festive-collections', 'bridal-celebrations'].includes(collection) ? collection : null);
    let bannerEntity = null;

    if (collection && ['new-arrivals', 'best-sellers', 'festive-collections', 'bridal-celebrations'].includes(collection)) {
      bannerEntity = await Collection.findOne({ where: { slug: collection } });
    } else if (categorySlug) {
      bannerEntity = await Category.findOne({ where: { slug: categorySlug } });
    }

    const variantWhere = { is_active: true };
    if (size) variantWhere.size = size;
    if (color) variantWhere.color_name = { [Op.like]: `%${color}%` };
    if (inStock === 'true') variantWhere.stock_qty = { [Op.gt]: 0 };

    const allMatched = await Product.findAll({
      where,
      include: [
        {
          model: Category,
          as: 'primaryCategory',
          ...(categorySlug ? { where: { slug: categorySlug } } : {}),
        },
        { model: ProductImage, as: 'images' },
        {
          model: ProductVariant,
          as: 'variants',
          where: Object.keys(variantWhere).length > 1 ? variantWhere : undefined,
          required: Object.keys(variantWhere).length > 1,
        },
        {
          model: Collection,
          as: 'collections',
          through: { attributes: [] },
          ...(collection && bannerEntity?.constructor?.name === 'Collection'
            ? { where: { slug: collection }, required: true }
            : {}),
        },
      ],
      order: orderClause,
    });

    const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
    const pageSize = Math.min(48, Math.max(1, Number.parseInt(limit, 10) || 12));
    const offset = (pageNum - 1) * pageSize;
    const paginated = allMatched.slice(offset, offset + pageSize);

    // Derive filter facets from catalog
    const allFacets = await Product.findAll({
      where: { is_active: true },
      attributes: ['fabric', 'occasion'],
      include: [{ model: ProductVariant, as: 'variants', attributes: ['size', 'color_name', 'color_hex'] }],
    });

    const sizes = new Set();
    const colors = new Map();
    const fabrics = new Set();
    const occasions = new Set();
    for (const item of allFacets) {
      if (item.fabric) fabrics.add(item.fabric);
      if (item.occasion) occasions.add(item.occasion);
      for (const v of item.variants || []) {
        if (v.size) sizes.add(v.size);
        if (v.color_name) colors.set(v.color_name, v.color_hex);
      }
    }

    return sendSuccess(
      res,
      {
        banner: bannerEntity,
        products: paginated,
        facets: {
          sizes: Array.from(sizes),
          colors: Array.from(colors.entries()).map(([name, hex]) => ({ name, hex })),
          fabrics: Array.from(fabrics),
          occasions: Array.from(occasions),
        },
      },
      'Products loaded',
      200,
      {
        total: allMatched.length,
        page: pageNum,
        limit: pageSize,
        totalPages: Math.max(1, Math.ceil(allMatched.length / pageSize)),
      }
    );
  } catch (err) {
    return next(err);
  }
};

const getProductBySlug = async (req, res, next) => {
  try {
    const product = await Product.findOne({
      where: { slug: req.params.slug, is_active: true },
      include: [
        ...productIncludeList,
        {
          model: ProductReview,
          as: 'reviews',
          where: { is_approved: true },
          required: false,
          include: [{ model: User, as: 'author', attributes: ['id', 'full_name'] }],
        },
        {
          model: ProductQuestion,
          as: 'questions',
          where: { is_published: true },
          required: false,
          include: [{ model: User, as: 'askedBy', attributes: ['id', 'full_name'] }],
        },
      ],
    });

    if (!product) {
      return next(new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND'));
    }

    const matchingIds = Array.isArray(product.matching_product_ids_json)
      ? product.matching_product_ids_json
      : [];

    const [matchingProducts, similarProducts] = await Promise.all([
      matchingIds.length > 0
        ? Product.findAll({
            where: { id: { [Op.in]: matchingIds }, is_active: true },
            include: productIncludeList,
          })
        : Promise.resolve([]),
      Product.findAll({
        where: {
          is_active: true,
          primary_category_id: product.primary_category_id,
          id: { [Op.ne]: product.id },
        },
        include: productIncludeList,
        limit: 4,
      }),
    ]);

    return sendSuccess(res, {
      product,
      matching_products: matchingProducts,
      similar_products: similarProducts,
    });
  } catch (err) {
    return next(err);
  }
};

const listCategories = async (req, res, next) => {
  try {
    const categories = await Category.findAll({ order: [['sort_order', 'ASC'], ['name', 'ASC']] });
    return sendSuccess(res, categories);
  } catch (err) {
    return next(err);
  }
};

const listCollections = async (req, res, next) => {
  try {
    const collections = await Collection.findAll({ order: [['sort_order', 'ASC'], ['name', 'ASC']] });
    return sendSuccess(res, collections);
  } catch (err) {
    return next(err);
  }
};

const createReview = async (req, res, next) => {
  try {
    const { product_id, rating, title, comment } = req.body;
    const verifiedOrder = await Order.findOne({
      where: { user_id: req.user.id, status: 'delivered' },
      include: [{ model: OrderItem, as: 'items', where: { product_id } }],
    });

    const review = await ProductReview.create({
      product_id,
      user_id: req.user.id,
      order_id: verifiedOrder?.id || null,
      rating,
      title,
      comment,
      is_verified_purchase: Boolean(verifiedOrder),
      is_approved: true,
    });

    const stats = await ProductReview.findAll({
      where: { product_id, is_approved: true },
      attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'avg'], [sequelize.fn('COUNT', sequelize.col('id')), 'cnt']],
      raw: true,
    });

    await Product.update(
      {
        rating_avg: Number(stats[0]?.avg || rating).toFixed(2),
        review_count: Number(stats[0]?.cnt || 1),
      },
      { where: { id: product_id } }
    );

    return sendSuccess(res, review, 'Review submitted', 201);
  } catch (err) {
    return next(err);
  }
};

const askProductQuestion = async (req, res, next) => {
  try {
    const product = await Product.findOne({ where: { id: req.params.id, is_active: true } });
    if (!product) return next(new AppError('Product not found', 404, 'NOT_FOUND'));

    const question = await ProductQuestion.create({
      product_id: product.id,
      user_id: req.user.id,
      question: req.body.question,
      is_published: true,
    });
    return sendSuccess(res, question, 'Question submitted', 201);
  } catch (err) {
    return next(err);
  }
};

const answerProductQuestion = async (req, res, next) => {
  try {
    const q = await ProductQuestion.findByPk(req.params.questionId);
    if (!q) return next(new AppError('Question not found', 404, 'NOT_FOUND'));
    await q.update({
      answer: req.body.answer,
      answered_by: req.user.id,
      answered_at: new Date(),
    });
    return sendSuccess(res, q, 'Answer published');
  } catch (err) {
    return next(err);
  }
};

// Admin Catalogue CRUD
const createProduct = async (req, res, next) => {
  try {
    const { variants = [], image_url, ...productFields } = req.body;
    const created = await sequelize.transaction(async (transaction) => {
      const product = await Product.create(productFields, { transaction });
      if (image_url) {
        await ProductImage.create(
          { product_id: product.id, image_url, alt_text: product.name, is_primary: true, sort_order: 1 },
          { transaction }
        );
      }

      const defaultWarehouse = await Warehouse.findOne({ where: { is_default: true }, transaction });
      const createdVariants = [];
      for (const v of variants) {
        const variant = await ProductVariant.create({ ...v, product_id: product.id }, { transaction });
        createdVariants.push(variant);
        if (defaultWarehouse) {
          await WarehouseStock.create(
            {
              warehouse_id: defaultWarehouse.id,
              variant_id: variant.id,
              quantity_on_hand: variant.stock_qty,
              reorder_level: variant.low_stock_threshold,
            },
            { transaction }
          );
        }
      }

      await recordAuditLog({
        actorId: req.user.id,
        action: 'PRODUCT_CREATED',
        entityType: 'product',
        entityId: product.id,
        newValues: productFields,
        ipAddress: req.ip,
        transaction,
      });

      return { product, variants: createdVariants };
    });

    return sendSuccess(res, created, 'Product created successfully', 201);
  } catch (err) {
    return next(err);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return next(new AppError('Product not found', 404, 'NOT_FOUND'));

    const oldValues = product.toJSON();
    const { image_url, ...updates } = req.body;
    await product.update(updates);
    if (image_url) {
      const primaryImg = await ProductImage.findOne({ where: { product_id: product.id, is_primary: true } });
      if (primaryImg) {
        await primaryImg.update({ image_url });
      } else {
        await ProductImage.create({ product_id: product.id, image_url, is_primary: true, alt_text: product.name });
      }
    }

    await recordAuditLog({
      actorId: req.user.id,
      action: 'PRODUCT_UPDATED',
      entityType: 'product',
      entityId: product.id,
      oldValues,
      newValues: updates,
      ipAddress: req.ip,
    });

    return sendSuccess(res, product, 'Product updated');
  } catch (err) {
    return next(err);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const category = await Category.create(req.body);
    return sendSuccess(res, category, 'Category created', 201);
  } catch (err) {
    return next(err);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) return next(new AppError('Category not found', 404, 'NOT_FOUND'));
    await category.update(req.body);
    return sendSuccess(res, category, 'Category updated');
  } catch (err) {
    return next(err);
  }
};

const createCollection = async (req, res, next) => {
  try {
    const collection = await Collection.create(req.body);
    return sendSuccess(res, collection, 'Collection created', 201);
  } catch (err) {
    return next(err);
  }
};

const addVariant = async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return next(new AppError('Product not found', 404, 'NOT_FOUND'));
    const variant = await ProductVariant.create({ ...req.body, product_id: product.id });
    return sendSuccess(res, variant, 'Variant added', 201);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getHomepage,
  searchSuggestions,
  listProducts,
  getProductBySlug,
  listCategories,
  listCollections,
  createReview,
  askProductQuestion,
  answerProductQuestion,
  createProduct,
  updateProduct,
  createCategory,
  updateCategory,
  createCollection,
  addVariant,
};
