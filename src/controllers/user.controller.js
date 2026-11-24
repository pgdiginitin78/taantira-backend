const { Op } = require('sequelize');
const {
  sequelize,
  User,
  CustomerProfile,
  CustomerAddress,
  Wishlist,
  WishlistItem,
  Product,
  ProductImage,
  ProductVariant,
  Category,
  Order,
  OrderItem,
  DeliveryAssignment,
  Payment,
  ReturnRequest,
  Notification,
  Newsletter,
} = require('../models');
const { sendSuccess } = require('../utils/response');
const { AppError } = require('../utils/errors');

const getDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const [profile, orders, wishlist, addresses, returns, notifications] = await Promise.all([
      CustomerProfile.findOne({ where: { user_id: userId } }),
      Order.findAll({
        where: { user_id: userId },
        include: [
          { model: OrderItem, as: 'items' },
          { model: DeliveryAssignment, as: 'deliveryAssignments' },
          { model: Payment, as: 'payments' },
        ],
        order: [['placed_at', 'DESC']],
      }),
      Wishlist.findOne({
        where: { user_id: userId },
        include: [{ model: WishlistItem, as: 'items' }],
      }),
      CustomerAddress.findAll({ where: { user_id: userId }, order: [['is_default', 'DESC']] }),
      ReturnRequest.findAll({ where: { user_id: userId }, order: [['created_at', 'DESC']], limit: 5 }),
      Notification.findAll({ where: { user_id: userId }, order: [['created_at', 'DESC']], limit: 10 }),
    ]);

    const monthlyMap = new Map();
    for (const order of orders) {
      if (order.status === 'cancelled' || order.status === 'failed') continue;
      const date = new Date(order.placed_at || order.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      const prev = monthlyMap.get(key) || { month: label, spending: 0, orders: 0 };
      prev.spending = Math.round((prev.spending + Number(order.total_amount)) * 100) / 100;
      prev.orders += 1;
      monthlyMap.set(key, prev);
    }

    const monthlySpending = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, val]) => val);

    const purchasedProductIds = orders.flatMap((o) => (o.items || []).map((i) => i.product_id));
    const recommendedProducts = await Product.findAll({
      where: {
        is_active: true,
        ...(purchasedProductIds.length > 0 ? { id: { [Op.notIn]: purchasedProductIds } } : {}),
      },
      include: [
        { model: ProductImage, as: 'images' },
        { model: Category, as: 'primaryCategory', attributes: ['id', 'name', 'slug'] },
        { model: ProductVariant, as: 'variants', attributes: ['id', 'size', 'color_name', 'color_hex', 'stock_qty'] },
      ],
      order: [['is_best_seller', 'DESC'], ['rating_avg', 'DESC']],
      limit: 4,
    });

    const activeDeliveryOrder = orders.find((o) =>
      ['new', 'processing', 'packing', 'ready_for_pickup', 'shipped'].includes(o.status)
    );

    const totalOrders = orders.length;
    const totalSpending = orders
      .filter((o) => !['cancelled', 'failed'].includes(o.status))
      .reduce((sum, o) => sum + Number(o.total_amount), 0);

    return sendSuccess(res, {
      user: req.user,
      stats: {
        total_orders: totalOrders,
        total_spending: Math.round(totalSpending * 100) / 100,
        wishlist_count: wishlist?.items?.length || 0,
        loyalty_points: profile?.loyalty_points || 0,
      },
      profile,
      recent_orders: orders.slice(0, 5),
      active_delivery_order: activeDeliveryOrder || null,
      monthly_spending: monthlySpending,
      saved_addresses: addresses,
      recent_returns: returns,
      notifications,
      recommended_products: recommendedProducts,
    });
  } catch (err) {
    return next(err);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'full_name', 'email', 'phone', 'status', 'created_at'],
      include: [{ model: CustomerProfile, as: 'customerProfile' }],
    });
    return sendSuccess(res, user);
  } catch (err) {
    return next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { full_name, phone, date_of_birth, preferred_size, marketing_opt_in } = req.body;
    await sequelize.transaction(async (transaction) => {
      await User.update({ full_name, phone }, { where: { id: req.user.id }, transaction });
      const [profile] = await CustomerProfile.findOrCreate({
        where: { user_id: req.user.id },
        defaults: { user_id: req.user.id },
        transaction,
      });
      await profile.update(
        { date_of_birth: date_of_birth || null, preferred_size: preferred_size || null, marketing_opt_in },
        { transaction }
      );
    });
    return getProfile(req, res, next);
  } catch (err) {
    return next(err);
  }
};

const listAddresses = async (req, res, next) => {
  try {
    const addresses = await CustomerAddress.findAll({
      where: { user_id: req.user.id },
      order: [['is_default', 'DESC'], ['created_at', 'DESC']],
    });
    return sendSuccess(res, addresses);
  } catch (err) {
    return next(err);
  }
};

const createAddress = async (req, res, next) => {
  try {
    const created = await sequelize.transaction(async (transaction) => {
      if (req.body.is_default) {
        await CustomerAddress.update({ is_default: false }, { where: { user_id: req.user.id }, transaction });
      }
      return CustomerAddress.create({ ...req.body, user_id: req.user.id }, { transaction });
    });
    return sendSuccess(res, created, 'Address saved', 201);
  } catch (err) {
    return next(err);
  }
};

const updateAddress = async (req, res, next) => {
  try {
    const address = await CustomerAddress.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!address) return next(new AppError('Address not found', 404, 'NOT_FOUND'));

    await sequelize.transaction(async (transaction) => {
      if (req.body.is_default) {
        await CustomerAddress.update({ is_default: false }, { where: { user_id: req.user.id }, transaction });
      }
      await address.update(req.body, { transaction });
    });
    return sendSuccess(res, address, 'Address updated');
  } catch (err) {
    return next(err);
  }
};

const deleteAddress = async (req, res, next) => {
  try {
    const deleted = await CustomerAddress.destroy({ where: { id: req.params.id, user_id: req.user.id } });
    if (!deleted) return next(new AppError('Address not found', 404, 'NOT_FOUND'));
    return sendSuccess(res, null, 'Address removed');
  } catch (err) {
    return next(err);
  }
};

const getWishlist = async (req, res, next) => {
  try {
    const [wishlist] = await Wishlist.findOrCreate({
      where: { user_id: req.user.id },
      defaults: { user_id: req.user.id },
    });
    const items = await WishlistItem.findAll({
      where: { wishlist_id: wishlist.id },
      include: [
        {
          model: Product,
          as: 'product',
          include: [
            { model: ProductImage, as: 'images' },
            { model: ProductVariant, as: 'variants' },
            { model: Category, as: 'primaryCategory', attributes: ['id', 'name', 'slug'] },
          ],
        },
        { model: ProductVariant, as: 'variant' },
      ],
    });
    return sendSuccess(res, { wishlist, items });
  } catch (err) {
    return next(err);
  }
};

const toggleWishlistItem = async (req, res, next) => {
  try {
    const { product_id, variant_id = null } = req.body;
    const [wishlist] = await Wishlist.findOrCreate({
      where: { user_id: req.user.id },
      defaults: { user_id: req.user.id },
    });
    const existing = await WishlistItem.findOne({
      where: { wishlist_id: wishlist.id, product_id },
    });
    if (existing) {
      await existing.destroy();
      return sendSuccess(res, { wishlisted: false }, 'Removed from wishlist');
    }
    const created = await WishlistItem.create({ wishlist_id: wishlist.id, product_id, variant_id });
    return sendSuccess(res, { wishlisted: true, item: created }, 'Added to wishlist', 201);
  } catch (err) {
    return next(err);
  }
};

const listNotifications = async (req, res, next) => {
  try {
    const items = await Notification.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']],
      limit: 50,
    });
    return sendSuccess(res, items);
  } catch (err) {
    return next(err);
  }
};

const markNotificationRead = async (req, res, next) => {
  try {
    if (req.params.id === 'all') {
      await Notification.update(
        { is_read: true, read_at: new Date() },
        { where: { user_id: req.user.id, is_read: false } }
      );
      return sendSuccess(res, null, 'All notifications marked as read');
    }
    const updated = await Notification.update(
      { is_read: true, read_at: new Date() },
      { where: { id: req.params.id, user_id: req.user.id } }
    );
    if (!updated[0]) return next(new AppError('Notification not found', 404, 'NOT_FOUND'));
    return sendSuccess(res, null, 'Notification marked as read');
  } catch (err) {
    return next(err);
  }
};

const subscribeNewsletter = async (req, res, next) => {
  try {
    const { email } = req.body;
    const [entry, created] = await Newsletter.findOrCreate({
      where: { email },
      defaults: { email, is_subscribed: true, subscribed_at: new Date() },
    });
    if (!created && !entry.is_subscribed) {
      await entry.update({ is_subscribed: true, subscribed_at: new Date() });
    }
    return sendSuccess(res, entry, 'Subscribed to Taantira Atelier updates', created ? 201 : 200);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getDashboard,
  getProfile,
  updateProfile,
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  getWishlist,
  toggleWishlistItem,
  listNotifications,
  markNotificationRead,
  subscribeNewsletter,
};
