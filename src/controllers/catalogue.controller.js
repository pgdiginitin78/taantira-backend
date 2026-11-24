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
  return {
    ...plain,
    category: plain.primaryCategory?.parent?.name || plain.primaryCategory?.name || '',
    subcategory: plain.primaryCategory?.parent ? plain.primaryCategory.name : '',
    gallery_angles: buildGalleryAngles(plain),
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
    } else {
      filtered = [...filtered].sort((a, b) => {
        const aHasImg = (a.images || []).length > 0 ? 1 : 0;
        const bHasImg = (b.images || []).length > 0 ? 1 : 0;
        if (aHasImg !== bHasImg) return bHasImg - aHasImg;
        return Number(a.id || 0) - Number(b.id || 0);
      });
    }

    const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
    const pageSize = Math.min(250, Math.max(1, Number.parseInt(limit, 10) || 24));
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
    const mainCategorySlug =
      product.primaryCategory?.parent?.slug || product.primaryCategory?.slug || '';
    const isJewelleryProduct = mainCategorySlug === 'jewellery';

    const fetchMatchingJewellery = async () => {
      if (isJewelleryProduct) {
        return matchingIds.length > 0
          ? Product.findAll({
              where: { id: { [Op.in]: matchingIds }, is_active: true },
              include: productIncludeList,
            })
          : [];
      }

      const explicitMatches =
        matchingIds.length > 0
          ? await Product.findAll({
              where: { id: { [Op.in]: matchingIds }, is_active: true },
              include: productIncludeList,
            })
          : [];

      if (explicitMatches.length >= 3) {
        return explicitMatches.slice(0, 3);
      }

      const existingIds = new Set(explicitMatches.map((m) => Number(m.id)));
      const allJewellery = await Product.findAll({
        where: { is_active: true },
        include: [
          {
            model: Category,
            as: 'primaryCategory',
            where: { slug: 'jewellery' },
            include: [{ model: Category, as: 'parent', attributes: ['id', 'name', 'slug', 'sort_order'] }],
          },
          { model: ProductImage, as: 'images' },
          { model: ProductVariant, as: 'variants' },
          { model: Collection, as: 'collections', attributes: ['id', 'name', 'slug'], through: { attributes: [] } },
        ],
        order: [['id', 'ASC']],
      });

      const remaining = allJewellery.filter((j) => !existingIds.has(Number(j.id)));
      if (mainCategorySlug === 'nauvari-sarees' || mainCategorySlug === 'paithani-tussar-sarees') {
        remaining.sort((a, b) => {
          const score = (x) => (x.slug.includes('nath') || x.slug.includes('kolhapuri') ? 0 : 1);
          return score(a) - score(b);
        });
      } else if (mainCategorySlug === 'kanjivaram-sarees') {
        remaining.sort((a, b) => {
          const score = (x) => (x.slug.includes('temple') || x.slug.includes('jhumka') ? 0 : 1);
          return score(a) - score(b);
        });
      }

      return [...explicitMatches, ...remaining].slice(0, 3);
    };

    const [matchingProducts, similarProducts] = await Promise.all([
      fetchMatchingJewellery(),
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
    const where = req.query.includeInactive === 'true' ? {} : { is_active: true };
    const [categories, productCounts] = await Promise.all([
      Category.findAll({
        where,
        include: [
          { model: Category, as: 'parent', attributes: ['id', 'name', 'slug'] },
          { model: Category, as: 'children', attributes: ['id', 'name', 'slug', 'sort_order', 'is_active'], required: false },
        ],
        order: [['sort_order', 'ASC'], ['name', 'ASC']],
      }),
      Product.findAll({
        attributes: ['primary_category_id', [sequelize.fn('COUNT', sequelize.col('id')), 'cnt']],
        group: ['primary_category_id'],
        raw: true,
      }),
    ]);

    const directCountMap = new Map(productCounts.map((r) => [Number(r.primary_category_id), Number(r.cnt)]));
    const enriched = categories.map((c) => {
      const plain = c.toJSON();
      const childSum = (plain.children || []).reduce((acc, ch) => acc + (directCountMap.get(Number(ch.id)) || 0), 0);
      return {
        ...plain,
        direct_product_count: directCountMap.get(Number(plain.id)) || 0,
        product_count: (directCountMap.get(Number(plain.id)) || 0) + childSum,
      };
    });

    return sendSuccess(res, enriched);
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

const ANGLE_LABELS = {
  1: 'Main Front View',
  2: 'Back View',
  3: 'Side / Three-Quarter View',
  4: 'Zari / Border Close-Up',
  5: 'Fabric & Weave Close-Up',
};

const buildDistinctGalleryRows = (productId, productName, galleryImages, singleImageUrl) => {
  const seenUrls = new Set();
  const rows = [];

  if (Array.isArray(galleryImages) && galleryImages.length > 0) {
    const sorted = [...galleryImages]
      .filter((img) => img && String(img.image_url || '').trim())
      .sort((a, b) => Number(a.sort_order || 1) - Number(b.sort_order || 1));

    for (const img of sorted) {
      const url = String(img.image_url).trim();
      if (seenUrls.has(url)) {
        throw new AppError('Each saree angle must use a distinct photo (duplicate URL rejected).', 400, 'DUPLICATE_IMAGE_URL');
      }
      seenUrls.add(url);
      const slot = Number(img.sort_order || rows.length + 1);
      rows.push({
        product_id: productId,
        image_url: url,
        alt_text: img.alt_text || `${productName} — ${ANGLE_LABELS[slot] || `Angle ${slot}`}`,
        is_primary: rows.length === 0,
        sort_order: slot,
      });
    }
    return rows;
  }

  if (singleImageUrl && String(singleImageUrl).trim()) {
    rows.push({
      product_id: productId,
      image_url: String(singleImageUrl).trim(),
      alt_text: `${productName} — Main Front View`,
      is_primary: true,
      sort_order: 1,
    });
  }

  return rows;
};

// Super Admin Catalogue CRUD
const createProduct = async (req, res, next) => {
  try {
    const { variants = [], image_url, gallery_images, ...productFields } = req.body;
    const category = await Category.findByPk(productFields.primary_category_id);
    if (!category) {
      return next(new AppError('Selected category/subcategory not found', 404, 'CATEGORY_NOT_FOUND'));
    }

    const created = await sequelize.transaction(async (transaction) => {
      const product = await Product.create(productFields, { transaction });
      const imageRows = buildDistinctGalleryRows(product.id, product.name, gallery_images, image_url);
      if (imageRows.length > 0) {
        await ProductImage.bulkCreate(imageRows, { transaction });
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
        newValues: { ...productFields, image_count: imageRows.length },
        ipAddress: req.ip,
        transaction,
      });

      return { product, variants: createdVariants, images: imageRows };
    });

    return sendSuccess(res, created, 'Product created successfully', 201);
  } catch (err) {
    return next(err);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id, { include: [{ model: ProductVariant, as: 'variants' }] });
    if (!product) return next(new AppError('Product not found', 404, 'NOT_FOUND'));

    const oldValues = product.toJSON();
    const { image_url, gallery_images, stock_qty, ...updates } = req.body;

    if (updates.primary_category_id) {
      const category = await Category.findByPk(updates.primary_category_id);
      if (!category) return next(new AppError('Selected category not found', 404, 'CATEGORY_NOT_FOUND'));
    }

    await sequelize.transaction(async (transaction) => {
      await product.update(updates, { transaction });

      if (Array.isArray(gallery_images) || image_url !== undefined) {
        const imageRows = buildDistinctGalleryRows(product.id, updates.name || product.name, gallery_images, image_url);
        await ProductImage.destroy({ where: { product_id: product.id }, transaction });
        if (imageRows.length > 0) {
          await ProductImage.bulkCreate(imageRows, { transaction });
        }
      }

      if (stock_qty !== undefined && product.variants?.[0]) {
        await product.variants[0].update({ stock_qty: Number(stock_qty) }, { transaction });
      }

      await recordAuditLog({
        actorId: req.user.id,
        action: 'PRODUCT_UPDATED',
        entityType: 'product',
        entityId: product.id,
        oldValues,
        newValues: updates,
        ipAddress: req.ip,
        transaction,
      });
    });

    const refreshed = await Product.findByPk(product.id, { include: productIncludeList });
    return sendSuccess(res, serializeProductWithAngles(refreshed), 'Product updated');
  } catch (err) {
    return next(err);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return next(new AppError('Product not found', 404, 'NOT_FOUND'));

    const usedInOrders = await OrderItem.count({ where: { product_id: product.id } });
    if (usedInOrders > 0) {
      await product.update({ is_active: false });
      return sendSuccess(res, { id: product.id, archived: true }, 'Product archived (referenced by historical orders)');
    }

    await product.destroy();
    return sendSuccess(res, { id: product.id, deleted: true }, 'Product removed permanently');
  } catch (err) {
    return next(err);
  }
};

const createCategory = async (req, res, next) => {
  try {
    if (req.body.parent_id) {
      const parent = await Category.findByPk(req.body.parent_id);
      if (!parent) return next(new AppError('Parent main category not found', 404, 'PARENT_NOT_FOUND'));
    }
    const category = await Category.create(req.body);
    await recordAuditLog({
      actorId: req.user.id,
      action: req.body.parent_id ? 'SUBCATEGORY_CREATED' : 'CATEGORY_CREATED',
      entityType: 'category',
      entityId: category.id,
      newValues: req.body,
      ipAddress: req.ip,
    });
    return sendSuccess(res, category, req.body.parent_id ? 'Subcategory created' : 'Main category created', 201);
  } catch (err) {
    return next(err);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) return next(new AppError('Category not found', 404, 'NOT_FOUND'));
    if (req.body.parent_id && Number(req.body.parent_id) === Number(category.id)) {
      return next(new AppError('Category cannot be its own parent', 400, 'INVALID_PARENT'));
    }
    const oldValues = category.toJSON();
    await category.update(req.body);
    await recordAuditLog({
      actorId: req.user.id,
      action: category.parent_id ? 'SUBCATEGORY_UPDATED' : 'CATEGORY_UPDATED',
      entityType: 'category',
      entityId: category.id,
      oldValues,
      newValues: req.body,
      ipAddress: req.ip,
    });
    return sendSuccess(res, category, 'Category updated');
  } catch (err) {
    return next(err);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) return next(new AppError('Category not found', 404, 'NOT_FOUND'));

    const [childCount, productCount] = await Promise.all([
      Category.count({ where: { parent_id: category.id } }),
      Product.count({ where: { primary_category_id: category.id } }),
    ]);

    if (childCount > 0) {
      return next(new AppError(`Cannot delete: ${childCount} subcategories still belong to this main category.`, 409, 'CATEGORY_HAS_CHILDREN'));
    }
    if (productCount > 0) {
      return next(new AppError(`Cannot delete: ${productCount} sarees/products are assigned to this category.`, 409, 'CATEGORY_HAS_PRODUCTS'));
    }

    await category.destroy();
    return sendSuccess(res, { id: category.id, deleted: true }, 'Category removed');
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
  deleteProduct,
  createCategory,
  updateCategory,
  deleteCategory,
  createCollection,
  addVariant,
};
