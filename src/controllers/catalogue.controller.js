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

const {
  normalizeCsvParam,
  buildGalleryAngles,
  getMatchingJewellery,
  filterCatalogueRecords,
  computeCatalogueFacets,
} = require('../services/catalogueFilter.service');

const productIncludeList = [
  {
    model: Category,
    as: 'primaryCategory',
    include: [{ model: Category, as: 'parent', attributes: ['id', 'name', 'slug', 'sort_order'] }],
  },
  { model: ProductImage, as: 'images' },
  { model: ProductVariant, as: 'variants' },
  { model: Collection, as: 'collections', attributes: ['id', 'name', 'slug'], through: { attributes: [] } },
];

const serializeProductWithAngles = (productInstance) => {
  const plain = typeof productInstance?.toJSON === 'function' ? productInstance.toJSON() : { ...productInstance };
  const mainSlug = plain.primaryCategory?.parent?.slug || plain.primaryCategory?.slug || '';
  return {
    ...plain,
    category: plain.primaryCategory?.parent?.name || plain.primaryCategory?.name || '',
    subcategory: plain.primaryCategory?.parent ? plain.primaryCategory.name : '',
    gallery_angles: buildGalleryAngles(plain),
    matching_jewellery: mainSlug && mainSlug !== 'jewellery' ? getMatchingJewellery(mainSlug) : [],
  };
};

const getHomepage = async (req, res, next) => {
  try {
    const [banners, promos, categories, collections, products, orderItems, reviews, settings] = await Promise.all([
      Banner.findAll({ where: { is_active: true }, order: [['sort_order', 'ASC']] }),
      PromotionalCampaign.findAll({ where: { is_active: true }, order: [['created_at', 'DESC']], limit: 3 }),
      Category.findAll({
        where: { is_active: true },
        include: [{ model: Category, as: 'children', where: { is_active: true }, required: false }],
        order: [['sort_order', 'ASC'], ['name', 'ASC']],
      }),
      Collection.findAll({ where: { is_active: true }, order: [['sort_order', 'ASC']] }),
      Product.findAll({
        where: { is_active: true },
        include: productIncludeList,
        order: [['created_at', 'DESC']],
      }),
      OrderItem.findAll({
        attributes: ['product_id', 'quantity'],
        include: [
          {
            model: Order,
            as: 'order',
            where: { status: { [Op.ne]: 'cancelled' } },
            attributes: [],
            required: true,
          },
        ],
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

    const salesCountByProduct = new Map();
    for (const item of orderItems) {
      const pid = Number(item.product_id);
      salesCountByProduct.set(pid, (salesCountByProduct.get(pid) || 0) + Number(item.quantity || 1));
    }

    const enrichedProducts = products.map((p) => {
      const plain = serializeProductWithAngles(p);
      return {
        ...plain,
        sales_count: salesCountByProduct.get(Number(plain.id)) || 0,
      };
    });

    const sareeProducts = enrichedProducts.filter((p) => p.primaryCategory?.slug !== 'jewellery');
    const jewelleryProducts = enrichedProducts.filter((p) => p.primaryCategory?.slug === 'jewellery');
    const nauvariSarees = sareeProducts.filter(
      (p) => p.primaryCategory?.parent?.slug === 'nauvari-sarees' || p.primaryCategory?.slug === 'nauvari-sarees'
    );
    const realBestSellers = sareeProducts
      .filter((p) => Number(p.sales_count || 0) > 0)
      .sort((a, b) => Number(b.sales_count || 0) - Number(a.sales_count || 0));

    const parentCategories = categories.filter((c) => !c.parent_id);

    const byMain = (mainSlug) =>
      sareeProducts
        .filter((p) => p.primaryCategory?.parent?.slug === mainSlug || p.primaryCategory?.slug === mainSlug)
        .slice(0, 6);

    return sendSuccess(res, {
      banners,
      promotional_bar: promos[0] || null,
      categories: parentCategories,
      main_categories: parentCategories.filter((c) => c.slug !== 'jewellery'),
      collections,
      handwoven_sarees: sareeProducts.filter((p) => (p.images || []).length > 0).slice(0, 8),
      nauvari_sarees: nauvariSarees.slice(0, 6),
      new_arrivals: sareeProducts.filter((p) => p.is_new_arrival).slice(0, 8),
      best_sellers: realBestSellers.slice(0, 8),
      best_sellers_available: realBestSellers.length > 0,
      trending_products: sareeProducts.filter((p) => p.is_trending).slice(0, 8),
      jewellery_products: jewelleryProducts.slice(0, 4),
      category_showcases: {
        sarees: sareeProducts.slice(0, 8),
        banarasi: byMain('banarasi-sarees'),
        kanjivaram: byMain('kanjivaram-sarees'),
        paithani_tussar: byMain('paithani-tussar-sarees'),
        organza_georgette: byMain('organza-georgette-sarees'),
        jamdani_chanderi: byMain('jamdani-chanderi-sarees'),
        nauvari: nauvariSarees.slice(0, 6),
        regional: byMain('regional-handloom-sarees'),
        jewellery: jewelleryProducts.slice(0, 4),
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

    const [allProducts, categories, collections] = await Promise.all([
      Product.findAll({
        where: { is_active: true },
        include: productIncludeList,
      }),
      Category.findAll({ where: { is_active: true, name: { [Op.like]: `%${q}%` } }, limit: 6 }),
      Collection.findAll({ where: { is_active: true, name: { [Op.like]: `%${q}%` } }, limit: 4 }),
    ]);

    const matchedProducts = filterCatalogueRecords(
      allProducts.map((p) => p.toJSON()),
      { q }
    ).slice(0, 8);

    return sendSuccess(res, { products: matchedProducts, categories, collections });
  } catch (err) {
    return next(err);
  }
};

const listProducts = async (req, res, next) => {
  try {
    const {
      collection,
      category,
      categories,
      subcategory,
      subcategories,
      fabric,
      fabrics,
      q,
      minPrice,
      maxPrice,
      inStock,
      sort = 'newest',
      page = 1,
      limit = 24,
    } = req.query;

    const productWhere = {};
    if (req.query.includeInactive !== 'true') {
      productWhere.is_active = true;
    }

    const [allCategories, allProducts, bannerCat, bannerCol] = await Promise.all([
      Category.findAll({
        where: { is_active: true },
        include: [{ model: Category, as: 'parent', attributes: ['id', 'name', 'slug'] }],
        order: [['sort_order', 'ASC'], ['name', 'ASC']],
      }),
      Product.findAll({
        where: productWhere,
        include: productIncludeList,
        order: [['id', 'ASC']],
      }),
      category ? Category.findOne({ where: { slug: category } }) : collection ? Category.findOne({ where: { slug: collection } }) : Promise.resolve(null),
      collection ? Collection.findOne({ where: { slug: collection } }) : Promise.resolve(null),
    ]);

    const plainProducts = allProducts.map(serializeProductWithAngles);
    const selectedCategories = normalizeCsvParam(categories || category);
    const selectedSubcategories = normalizeCsvParam(subcategories || subcategory);
    const selectedFabrics = normalizeCsvParam(fabrics || fabric);

    let filtered = filterCatalogueRecords(plainProducts, {
      collection,
      categories: selectedCategories,
      subcategories: selectedSubcategories,
      fabrics: selectedFabrics,
      q,
      minPrice,
      maxPrice,
      inStock,
    });

    if (sort === 'price_asc') {
      filtered = [...filtered].sort((a, b) => Number(a.sale_price ?? a.base_price) - Number(b.sale_price ?? b.base_price));
    } else if (sort === 'price_desc') {
      filtered = [...filtered].sort((a, b) => Number(b.sale_price ?? b.base_price) - Number(a.sale_price ?? a.base_price));
    } else if (sort === 'rating') {
      filtered = [...filtered].sort((a, b) => Number(b.rating_avg || 0) - Number(a.rating_avg || 0));
    } else if (sort === 'name_asc') {
      filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    }

    const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
    const pageSize = Math.min(48, Math.max(1, Number.parseInt(limit, 10) || 24));
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(pageNum, totalPages);
    const offset = (safePage - 1) * pageSize;
    const paginated = filtered.slice(offset, offset + pageSize);

    const facets = computeCatalogueFacets(
      plainProducts,
      allCategories.map((c) => c.toJSON())
    );

    return sendSuccess(
      res,
      {
        banner: bannerCol || bannerCat || null,
        products: paginated,
        facets,
      },
      'Products loaded',
      200,
      {
        total: filtered.length,
        page: safePage,
        limit: pageSize,
        totalPages,
      }
    );
  } catch (err) {
    return next(err);
  }
};

const getProductBySlug = async (req, res, next) => {
  try {
    const productInstance = await Product.findOne({
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

    if (!productInstance) {
      return next(new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND'));
    }

    const product = serializeProductWithAngles(productInstance);

    const matchingIds = Array.isArray(product.matching_product_ids_json)
      ? product.matching_product_ids_json
      : [];

    const [matchingProducts, similarProducts] = await Promise.all([
      matchingIds.length > 0
        ? Product.findAll({
            where: { id: { [Op.in]: matchingIds }, is_active: true },
            include: productIncludeList,
          })
        : Product.findAll({
            where: { is_active: true },
            include: [
              { model: Category, as: 'primaryCategory', where: { slug: 'jewellery' } },
              { model: ProductImage, as: 'images' },
              { model: ProductVariant, as: 'variants' },
            ],
            limit: 2,
          }),
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
      matching_products: matchingProducts.map(serializeProductWithAngles),
      similar_products: similarProducts.map(serializeProductWithAngles),
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
