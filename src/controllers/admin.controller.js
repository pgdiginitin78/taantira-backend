const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const {
  sequelize,
  User,
  Role,
  Permission,
  UserRole,
  CustomerProfile,
  Order,
  OrderItem,
  OrderAddress,
  OrderCancellation,
  Payment,
  Refund,
  ReturnRequest,
  Product,
  Category,
  ProductVariant,
  WarehouseStock,
  StockMovement,
  DeliveryAssignment,
  DeliveryPartner,
  CourierShipment,
  Coupon,
  Banner,
  PromotionalCampaign,
  SupportTicket,
  SupportMessage,
  AdminAuditLog,
  SystemSetting,
} = require('../models');
const { recordAuditLog } = require('../middleware/audit');
const { sendSuccess } = require('../utils/response');
const { AppError } = require('../utils/errors');

const buildDateFilter = (startDate, endDate, column = 'placed_at') => {
  if (!startDate && !endDate) return {};
  const range = {};
  if (startDate) range[Op.gte] = new Date(startDate);
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    range[Op.lte] = end;
  }
  return { [column]: range };
};

const getDashboardAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const orderWhere = buildDateFilter(startDate, endDate, 'placed_at');

    const [
      orders,
      refunds,
      lowStockVariants,
      stockMovements,
      assignments,
      customerProfiles,
    ] = await Promise.all([
      Order.findAll({
        where: orderWhere,
        include: [
          {
            model: OrderItem,
            as: 'items',
            include: [{ model: Product, as: 'product', include: [{ model: Category, as: 'primaryCategory' }] }],
          },
          { model: OrderAddress, as: 'shippingAddress' },
          { model: Payment, as: 'payments' },
        ],
        order: [['placed_at', 'ASC']],
      }),
      Refund.findAll({ where: buildDateFilter(startDate, endDate, 'created_at'), order: [['created_at', 'ASC']] }),
      ProductVariant.findAll({
        where: sequelize.where(sequelize.col('stock_qty'), Op.lte, sequelize.col('low_stock_threshold')),
        include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'slug', 'sku'] }],
      }),
      StockMovement.findAll({ order: [['created_at', 'ASC']], limit: 200 }),
      DeliveryAssignment.findAll({ include: [{ model: DeliveryPartner, as: 'partner', include: [{ model: User, as: 'user', attributes: ['full_name'] }] }] }),
      CustomerProfile.findAll(),
    ]);

    const nonCancelled = orders.filter((o) => !['cancelled', 'failed'].includes(o.status));
    const grossSales = nonCancelled.reduce((s, o) => s + Number(o.subtotal) + Number(o.tax_amount), 0);
    const refundTotal = refunds.reduce((s, r) => s + Number(r.amount), 0);
    const netSales = nonCancelled.reduce((s, o) => s + Number(o.total_amount), 0) - refundTotal;
    const totalOrders = orders.length;
    const avgOrderValue = nonCancelled.length > 0 ? netSales / nonCancelled.length : 0;

    const newCustomers = customerProfiles.filter((c) => c.total_orders <= 1).length;
    const returningCustomers = customerProfiles.filter((c) => c.total_orders > 1).length;
    const pendingOrders = orders.filter((o) => ['new', 'processing', 'packing', 'ready_for_pickup'].includes(o.status)).length;
    const cancelledOrders = orders.filter((o) => o.status === 'cancelled').length;
    const deliveredOrders = orders.filter((o) => o.status === 'delivered').length;

    // 1. Sales and revenue trend + 2. Orders by day/month + 7. Cancellation trend
    const dailyMap = new Map();
    const monthlyMap = new Map();
    const statusMap = new Map();
    const categorySalesMap = new Map();
    const productSalesMap = new Map();
    const paymentDistMap = new Map();
    const stateSalesMap = new Map();

    for (const o of orders) {
      const d = new Date(o.placed_at || o.created_at);
      const dayKey = d.toISOString().slice(0, 10);
      const monthKey = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });

      const dayRec = dailyMap.get(dayKey) || { date: dayKey, gross: 0, net: 0, orders: 0, cancelled: 0 };
      dayRec.orders += 1;
      if (o.status === 'cancelled') dayRec.cancelled += 1;
      else {
        dayRec.gross += Number(o.subtotal);
        dayRec.net += Number(o.total_amount);
      }
      dailyMap.set(dayKey, dayRec);

      const monthRec = monthlyMap.get(monthKey) || { month: monthKey, orders: 0, revenue: 0 };
      monthRec.orders += 1;
      if (!['cancelled', 'failed'].includes(o.status)) monthRec.revenue += Number(o.total_amount);
      monthlyMap.set(monthKey, monthRec);

      statusMap.set(o.status, (statusMap.get(o.status) || 0) + 1);
      paymentDistMap.set(o.payment_method, (paymentDistMap.get(o.payment_method) || 0) + Number(o.total_amount));

      const stateName = o.shippingAddress?.state || 'Unknown';
      const st = stateSalesMap.get(stateName) || { state: stateName, sales: 0, orders: 0 };
      st.orders += 1;
      if (!['cancelled', 'failed'].includes(o.status)) st.sales += Number(o.total_amount);
      stateSalesMap.set(stateName, st);

      if (!['cancelled', 'failed'].includes(o.status)) {
        for (const item of o.items || []) {
          const catName = item.product?.primaryCategory?.name || 'Other';
          categorySalesMap.set(catName, (categorySalesMap.get(catName) || 0) + Number(item.total_price));

          const pRec = productSalesMap.get(item.product_name) || { name: item.product_name, units: 0, revenue: 0 };
          pRec.units += item.quantity;
          pRec.revenue += Number(item.total_price);
          productSalesMap.set(item.product_name, pRec);
        }
      }
    }

    // 8. Refund trend
    const refundTrendMap = new Map();
    for (const r of refunds) {
      const day = new Date(r.created_at).toISOString().slice(0, 10);
      refundTrendMap.set(day, (refundTrendMap.get(day) || 0) + Number(r.amount));
    }

    // 10. Delivery performance
    const partnerPerfMap = new Map();
    for (const a of assignments) {
      const name = a.partner?.user?.full_name || `Partner #${a.delivery_partner_id}`;
      const rec = partnerPerfMap.get(name) || { partner: name, delivered: 0, active: 0, rejected: 0 };
      if (a.status === 'delivered') rec.delivered += 1;
      else if (a.status === 'rejected') rec.rejected += 1;
      else rec.active += 1;
      partnerPerfMap.set(name, rec);
    }

    // 11. Inventory movements
    const invMoveMap = new Map();
    for (const m of stockMovements) {
      const type = m.movement_type;
      const rec = invMoveMap.get(type) || { type, count: 0, units: 0 };
      rec.count += 1;
      rec.units += Math.abs(m.quantity_delta);
      invMoveMap.set(type, rec);
    }

    return sendSuccess(res, {
      kpis: {
        gross_sales: Math.round(grossSales * 100) / 100,
        net_sales: Math.round(netSales * 100) / 100,
        total_orders: totalOrders,
        average_order_value: Math.round(avgOrderValue * 100) / 100,
        new_customers: newCustomers,
        returning_customers: returningCustomers,
        pending_orders: pendingOrders,
        cancelled_orders: cancelledOrders,
        refund_totals: Math.round(refundTotal * 100) / 100,
        delivered_orders: deliveredOrders,
        low_stock_count: lowStockVariants.length,
      },
      low_stock_products: lowStockVariants,
      charts: {
        sales_revenue_trend: Array.from(dailyMap.values()),
        orders_by_period: Array.from(monthlyMap.values()),
        order_status_distribution: Array.from(statusMap.entries()).map(([name, value]) => ({ name, value })),
        category_sales: Array.from(categorySalesMap.entries()).map(([category, sales]) => ({ category, sales })),
        top_selling_products: Array.from(productSalesMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 6),
        payment_distribution: Array.from(paymentDistMap.entries()).map(([method, amount]) => ({ method: method.toUpperCase(), amount })),
        cancellation_trend: Array.from(dailyMap.values()).map((d) => ({ date: d.date, cancelled: d.cancelled })),
        refund_trend: Array.from(refundTrendMap.entries()).map(([date, amount]) => ({ date, amount })),
        customer_retention: [
          { segment: 'New Customers', count: newCustomers },
          { segment: 'Returning Customers', count: returningCustomers },
        ],
        delivery_performance: Array.from(partnerPerfMap.values()),
        inventory_movements: Array.from(invMoveMap.values()),
        sales_by_state: Array.from(stateSalesMap.values()),
      },
    });
  } catch (err) {
    return next(err);
  }
};

const exportReportCsv = async (req, res, next) => {
  try {
    const type = req.params.type || 'sales';
    const orders = await Order.findAll({
      include: [
        { model: User, as: 'customer', attributes: ['full_name', 'email'] },
        { model: OrderAddress, as: 'shippingAddress' },
      ],
      order: [['placed_at', 'DESC']],
    });

    const escapeCsv = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    let header = ['Order Number', 'Customer', 'Email', 'Status', 'Payment Method', 'Payment Status', 'State', 'Total INR', 'Placed At'];
    let rows = orders.map((o) => [
      o.order_number,
      o.customer?.full_name,
      o.customer?.email,
      o.status,
      o.payment_method,
      o.payment_status,
      o.shippingAddress?.state || '',
      o.total_amount,
      new Date(o.placed_at).toISOString(),
    ]);

    if (type === 'inventory') {
      const stocks = await WarehouseStock.findAll({
        include: [{ model: ProductVariant, as: 'variant', include: [{ model: Product, as: 'product' }] }],
      });
      header = ['Product', 'SKU', 'Size', 'Color', 'On Hand', 'Reserved', 'Reorder Level'];
      rows = stocks.map((s) => [
        s.variant?.product?.name,
        s.variant?.sku,
        s.variant?.size,
        s.variant?.color_name,
        s.quantity_on_hand,
        s.quantity_reserved,
        s.reorder_level,
      ]);
    } else if (type === 'coupons') {
      const coupons = await Coupon.findAll();
      header = ['Code', 'Type', 'Value', 'Min Purchase', 'Used Count', 'Active'];
      rows = coupons.map((c) => [c.code, c.discount_type, c.discount_value, c.min_purchase_amount, c.used_count, c.is_active]);
    }

    const csv = [header.map(escapeCsv).join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="taantira-${type}-report.csv"`);
    return res.send(csv);
  } catch (err) {
    return next(err);
  }
};

const listCustomersAdmin = async (req, res, next) => {
  try {
    const customers = await User.findAll({
      attributes: ['id', 'full_name', 'email', 'phone', 'status', 'created_at'],
      include: [
        { model: Role, as: 'roles', where: { slug: 'customer' }, through: { attributes: [] } },
        { model: CustomerProfile, as: 'customerProfile' },
        { model: Order, as: 'orders', attributes: ['id', 'order_number', 'status', 'total_amount', 'placed_at'] },
        { model: Refund, as: 'refunds' },
      ],
      order: [['created_at', 'DESC']],
    });
    return sendSuccess(res, customers);
  } catch (err) {
    return next(err);
  }
};

const listStaffAndRoles = async (req, res, next) => {
  try {
    const [roles, permissions, staffUsers] = await Promise.all([
      Role.findAll({ include: [{ model: Permission, as: 'permissions', through: { attributes: [] } }] }),
      Permission.findAll(),
      User.findAll({
        attributes: ['id', 'full_name', 'email', 'phone', 'status', 'last_login_at'],
        include: [{ model: Role, as: 'roles', where: { slug: { [Op.notIn]: ['customer', 'delivery_partner'] } }, through: { attributes: [] } }],
      }),
    ]);
    return sendSuccess(res, { roles, permissions, staff: staffUsers });
  } catch (err) {
    return next(err);
  }
};

const createStaffUser = async (req, res, next) => {
  try {
    const { full_name, email, phone, password, role_slug } = req.body;
    const role = await Role.findOne({ where: { slug: role_slug } });
    if (!role) return next(new AppError('Invalid role', 400, 'INVALID_ROLE'));

    const password_hash = await bcrypt.hash(password, 10);
    const created = await sequelize.transaction(async (transaction) => {
      const user = await User.create({ full_name, email, phone, password_hash, status: 'active' }, { transaction });
      await UserRole.create({ user_id: user.id, role_id: role.id }, { transaction });
      await recordAuditLog({
        actorId: req.user.id,
        action: 'STAFF_CREATED',
        entityType: 'user',
        entityId: user.id,
        newValues: { email, role_slug },
        ipAddress: req.ip,
        transaction,
      });
      return user;
    });
    return sendSuccess(res, { id: created.id, full_name, email, role_slug }, 'Staff member added', 201);
  } catch (err) {
    return next(err);
  }
};

const getSettingsAdmin = async (req, res, next) => {
  try {
    const settings = await SystemSetting.findAll({ order: [['group_name', 'ASC'], ['setting_key', 'ASC']] });
    return sendSuccess(res, settings);
  } catch (err) {
    return next(err);
  }
};

const updateSettingsAdmin = async (req, res, next) => {
  try {
    const updates = req.body.settings || [];
    for (const item of updates) {
      await SystemSetting.upsert({
        setting_key: item.setting_key,
        setting_value: String(item.setting_value),
        group_name: item.group_name || 'general',
        is_public: item.is_public !== undefined ? Boolean(item.is_public) : true,
      });
    }
    await recordAuditLog({
      actorId: req.user.id,
      action: 'SETTINGS_UPDATED',
      entityType: 'system_settings',
      newValues: updates,
      ipAddress: req.ip,
    });
    return sendSuccess(res, null, 'System settings updated');
  } catch (err) {
    return next(err);
  }
};

const listAuditLogs = async (req, res, next) => {
  try {
    const logs = await AdminAuditLog.findAll({
      include: [{ model: User, as: 'actor', attributes: ['id', 'full_name', 'email'] }],
      order: [['created_at', 'DESC']],
      limit: 100,
    });
    return sendSuccess(res, logs);
  } catch (err) {
    return next(err);
  }
};

// Support Tickets
const listTickets = async (req, res, next) => {
  try {
    const isStaffUser = (req.user.roles || []).some((r) => r !== 'customer' && r !== 'delivery_partner');
    const where = isStaffUser ? {} : { user_id: req.user.id };
    const tickets = await SupportTicket.findAll({
      where,
      include: [
        { model: User, as: 'customer', attributes: ['id', 'full_name', 'email'] },
        { model: Order, as: 'order', attributes: ['id', 'order_number'] },
        { model: SupportMessage, as: 'messages', include: [{ model: User, as: 'sender', attributes: ['id', 'full_name'] }] },
      ],
      order: [['created_at', 'DESC']],
    });
    return sendSuccess(res, tickets);
  } catch (err) {
    return next(err);
  }
};

const createTicket = async (req, res, next) => {
  try {
    const { order_id = null, subject, category, priority, message } = req.body;
    const ticket = await sequelize.transaction(async (transaction) => {
      const created = await SupportTicket.create(
        {
          ticket_number: `TKT-${Date.now().toString().slice(-6)}`,
          user_id: req.user.id,
          order_id,
          subject,
          category,
          priority,
          status: 'open',
        },
        { transaction }
      );
      await SupportMessage.create(
        { ticket_id: created.id, sender_id: req.user.id, message, is_internal: false },
        { transaction }
      );
      return created;
    });
    return sendSuccess(res, ticket, 'Support ticket opened', 201);
  } catch (err) {
    return next(err);
  }
};

const replyTicket = async (req, res, next) => {
  try {
    const ticket = await SupportTicket.findByPk(req.params.id);
    if (!ticket) return next(new AppError('Ticket not found', 404, 'NOT_FOUND'));

    const isStaffUser = (req.user.roles || []).some((r) => r !== 'customer' && r !== 'delivery_partner');
    if (!isStaffUser && Number(ticket.user_id) !== Number(req.user.id)) {
      return next(new AppError('Access denied', 403, 'FORBIDDEN'));
    }

    const msg = await SupportMessage.create({
      ticket_id: ticket.id,
      sender_id: req.user.id,
      message: req.body.message,
      is_internal: isStaffUser ? Boolean(req.body.is_internal) : false,
    });

    if (req.body.status && isStaffUser) {
      await ticket.update({ status: req.body.status });
    }
    return sendSuccess(res, msg, 'Reply added', 201);
  } catch (err) {
    return next(err);
  }
};

const getDetailedReports = async (req, res, next) => {
  try {
    const [sales, cancellations, refunds, returns, couriers, coupons] = await Promise.all([
      Order.findAll({ attributes: ['id', 'order_number', 'status', 'payment_method', 'payment_status', 'total_amount', 'placed_at'], order: [['placed_at', 'DESC']], limit: 50 }),
      OrderCancellation.findAll({ limit: 30 }),
      Refund.findAll({ limit: 30 }),
      ReturnRequest.findAll({ limit: 30 }),
      CourierShipment.findAll({ limit: 30 }),
      Coupon.findAll(),
    ]);
    return sendSuccess(res, { sales, cancellations, refunds, returns, couriers, coupons });
  } catch (err) {
    return next(err);
  }
};

const getMarketingAssets = async (req, res, next) => {
  try {
    const [banners, campaigns] = await Promise.all([
      Banner.findAll({ order: [['sort_order', 'ASC']] }),
      PromotionalCampaign.findAll({ order: [['created_at', 'DESC']] }),
    ]);
    return sendSuccess(res, { banners, campaigns });
  } catch (err) {
    return next(err);
  }
};

const createBanner = async (req, res, next) => {
  try {
    const banner = await Banner.create(req.body);
    return sendSuccess(res, banner, 'Banner created', 201);
  } catch (err) {
    return next(err);
  }
};

const createCampaign = async (req, res, next) => {
  try {
    const campaign = await PromotionalCampaign.create(req.body);
    return sendSuccess(res, campaign, 'Campaign created', 201);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getDashboardAnalytics,
  exportReportCsv,
  listCustomersAdmin,
  listStaffAndRoles,
  createStaffUser,
  getSettingsAdmin,
  updateSettingsAdmin,
  listAuditLogs,
  listTickets,
  createTicket,
  replyTicket,
  getDetailedReports,
  getMarketingAssets,
  createBanner,
  createCampaign,
};
