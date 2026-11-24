const {
  sequelize,
  Cart,
  CartItem,
  Product,
  ProductVariant,
  ProductImage,
  Category,
  Coupon,
  CouponProduct,
  CouponCategory,
  CouponUsage,
  Wishlist,
  WishlistItem,
} = require('../models');
const { computeCartTotals } = require('../services/pricing.service');
const { recordAuditLog } = require('../middleware/audit');
const { sendSuccess } = require('../utils/response');
const { AppError } = require('../utils/errors');

const getOrCreateActiveCart = async (userId) => {
  let cart = await Cart.findOne({ where: { user_id: userId, status: 'active' } });
  if (!cart) {
    cart = await Cart.create({ user_id: userId, status: 'active' });
  }
  return cart;
};

const loadHydratedCart = async (userId, pincode = null) => {
  const cart = await getOrCreateActiveCart(userId);
  const fullCart = await Cart.findByPk(cart.id, {
    include: [
      { model: Coupon, as: 'coupon' },
      {
        model: CartItem,
        as: 'items',
        include: [
          {
            model: Product,
            as: 'product',
            include: [
              { model: Category, as: 'primaryCategory' },
              { model: ProductImage, as: 'images' },
            ],
          },
          { model: ProductVariant, as: 'variant' },
        ],
      },
    ],
  });

  const summary = await computeCartTotals({
    cartItems: fullCart.items || [],
    couponCode: fullCart.coupon?.code || null,
    userId,
    pincode,
  });

  return {
    cart_id: fullCart.id,
    items: fullCart.items || [],
    summary,
  };
};

const getCart = async (req, res, next) => {
  try {
    const data = await loadHydratedCart(req.user.id, req.query.pincode || null);
    return sendSuccess(res, data);
  } catch (err) {
    return next(err);
  }
};

const addCartItem = async (req, res, next) => {
  try {
    const { product_id, variant_id, quantity = 1, custom_options = null } = req.body;
    const variant = await ProductVariant.findOne({
      where: { id: variant_id, product_id, is_active: true },
      include: [{ model: Product, as: 'product', include: [{ model: Category, as: 'primaryCategory' }] }],
    });

    if (!variant || !variant.product || !variant.product.is_active) {
      return next(new AppError('Selected product variant is unavailable', 404, 'VARIANT_NOT_FOUND'));
    }

    const availableQty = variant.stock_qty - variant.reserved_qty;
    if (availableQty < quantity) {
      return next(new AppError(`Only ${availableQty} units available in stock`, 409, 'INSUFFICIENT_STOCK'));
    }

    // Sanitize category-dependent options server-side
    const cat = variant.product.primaryCategory || {};
    const sanitizedOptions = custom_options
      ? {
          matching_blouse: cat.supports_blouse_option ? Boolean(custom_options.matching_blouse) : false,
          blouse_stitching_notes: cat.supports_blouse_option ? custom_options.blouse_stitching_notes || null : null,
          petticoat: cat.supports_petticoat_option ? Boolean(custom_options.petticoat) : false,
          gift_wrap: cat.supports_gift_options !== false ? Boolean(custom_options.gift_wrap) : false,
          gift_box: cat.supports_gift_options !== false ? Boolean(custom_options.gift_box) : false,
          tote_bag: cat.supports_gift_options !== false ? Boolean(custom_options.tote_bag) : false,
          customisation_notes: cat.supports_customisation ? custom_options.customisation_notes || null : null,
        }
      : null;

    const cart = await getOrCreateActiveCart(req.user.id);
    const existing = await CartItem.findOne({
      where: { cart_id: cart.id, product_id, variant_id },
    });

    if (existing) {
      const nextQty = existing.quantity + quantity;
      if (nextQty > availableQty) {
        return next(new AppError(`Maximum available stock is ${availableQty}`, 409, 'INSUFFICIENT_STOCK'));
      }
      await existing.update({
        quantity: nextQty,
        ...(sanitizedOptions ? { custom_options_json: sanitizedOptions } : {}),
      });
    } else {
      await CartItem.create({
        cart_id: cart.id,
        product_id,
        variant_id,
        quantity,
        custom_options_json: sanitizedOptions,
      });
    }

    const updated = await loadHydratedCart(req.user.id);
    return sendSuccess(res, updated, 'Added to shopping bag', 201);
  } catch (err) {
    return next(err);
  }
};

const updateCartItem = async (req, res, next) => {
  try {
    const cart = await getOrCreateActiveCart(req.user.id);
    const item = await CartItem.findOne({
      where: { id: req.params.itemId, cart_id: cart.id },
      include: [{ model: ProductVariant, as: 'variant' }],
    });
    if (!item) return next(new AppError('Cart item not found', 404, 'NOT_FOUND'));

    const availableQty = item.variant.stock_qty - item.variant.reserved_qty;
    if (req.body.quantity > availableQty) {
      return next(new AppError(`Only ${availableQty} units available in stock`, 409, 'INSUFFICIENT_STOCK'));
    }

    await item.update({ quantity: req.body.quantity });
    const updated = await loadHydratedCart(req.user.id);
    return sendSuccess(res, updated, 'Bag updated');
  } catch (err) {
    return next(err);
  }
};

const removeCartItem = async (req, res, next) => {
  try {
    const cart = await getOrCreateActiveCart(req.user.id);
    const deleted = await CartItem.destroy({ where: { id: req.params.itemId, cart_id: cart.id } });
    if (!deleted) return next(new AppError('Cart item not found', 404, 'NOT_FOUND'));
    const updated = await loadHydratedCart(req.user.id);
    return sendSuccess(res, updated, 'Item removed from bag');
  } catch (err) {
    return next(err);
  }
};

const moveCartItemToWishlist = async (req, res, next) => {
  try {
    const cart = await getOrCreateActiveCart(req.user.id);
    const item = await CartItem.findOne({ where: { id: req.params.itemId, cart_id: cart.id } });
    if (!item) return next(new AppError('Cart item not found', 404, 'NOT_FOUND'));

    const [wishlist] = await Wishlist.findOrCreate({
      where: { user_id: req.user.id },
      defaults: { user_id: req.user.id },
    });
    await WishlistItem.findOrCreate({
      where: { wishlist_id: wishlist.id, product_id: item.product_id },
      defaults: { wishlist_id: wishlist.id, product_id: item.product_id, variant_id: item.variant_id },
    });
    await item.destroy();

    const updated = await loadHydratedCart(req.user.id);
    return sendSuccess(res, updated, 'Moved item to wishlist');
  } catch (err) {
    return next(err);
  }
};

const applyCouponToCart = async (req, res, next) => {
  try {
    const cart = await getOrCreateActiveCart(req.user.id);
    const fullCart = await Cart.findByPk(cart.id, {
      include: [
        {
          model: CartItem,
          as: 'items',
          include: [
            { model: Product, as: 'product', include: [{ model: Category, as: 'primaryCategory' }] },
            { model: ProductVariant, as: 'variant' },
          ],
        },
      ],
    });

    const summary = await computeCartTotals({
      cartItems: fullCart.items || [],
      couponCode: req.body.code,
      userId: req.user.id,
    });

    if (summary.coupon) {
      await cart.update({ coupon_id: summary.coupon.id });
    }

    const updated = await loadHydratedCart(req.user.id);
    return sendSuccess(res, updated, `Coupon ${req.body.code} applied`);
  } catch (err) {
    return next(err);
  }
};

const removeCouponFromCart = async (req, res, next) => {
  try {
    const cart = await getOrCreateActiveCart(req.user.id);
    await cart.update({ coupon_id: null });
    const updated = await loadHydratedCart(req.user.id);
    return sendSuccess(res, updated, 'Coupon removed');
  } catch (err) {
    return next(err);
  }
};

// Coupons Admin & Public Listing
const listCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.findAll({
      include: [
        { association: 'restrictedProducts', attributes: ['id', 'name'], through: { attributes: [] } },
        { association: 'restrictedCategories', attributes: ['id', 'name'], through: { attributes: [] } },
        { model: CouponUsage, as: 'usages', attributes: ['id', 'discount_applied', 'used_at'] },
      ],
      order: [['created_at', 'DESC']],
    });
    return sendSuccess(res, coupons);
  } catch (err) {
    return next(err);
  }
};

const createCoupon = async (req, res, next) => {
  try {
    const { product_ids = [], category_ids = [], ...fields } = req.body;
    const coupon = await sequelize.transaction(async (transaction) => {
      const created = await Coupon.create(fields, { transaction });
      if (product_ids.length > 0) {
        await CouponProduct.bulkCreate(
          product_ids.map((product_id) => ({ coupon_id: created.id, product_id })),
          { transaction }
        );
      }
      if (category_ids.length > 0) {
        await CouponCategory.bulkCreate(
          category_ids.map((category_id) => ({ coupon_id: created.id, category_id })),
          { transaction }
        );
      }
      await recordAuditLog({
        actorId: req.user.id,
        action: 'COUPON_CREATED',
        entityType: 'coupon',
        entityId: created.id,
        newValues: fields,
        ipAddress: req.ip,
        transaction,
      });
      return created;
    });
    return sendSuccess(res, coupon, 'Coupon created', 201);
  } catch (err) {
    return next(err);
  }
};

const updateCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findByPk(req.params.id);
    if (!coupon) return next(new AppError('Coupon not found', 404, 'NOT_FOUND'));
    await coupon.update(req.body);
    return sendSuccess(res, coupon, 'Coupon updated');
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  moveCartItemToWishlist,
  applyCouponToCart,
  removeCouponFromCart,
  listCoupons,
  createCoupon,
  updateCoupon,
};
