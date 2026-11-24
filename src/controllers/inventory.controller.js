const {
  sequelize,
  Warehouse,
  WarehouseStock,
  StockMovement,
  ProductVariant,
  Product,
  MediaFile,
} = require('../models');
const { hasValidMagicBytes } = require('../middleware/upload');
const { recordAuditLog } = require('../middleware/audit');
const { sendSuccess } = require('../utils/response');
const { AppError } = require('../utils/errors');

const getInventoryOverview = async (req, res, next) => {
  try {
    const [warehouses, stocks, movements] = await Promise.all([
      Warehouse.findAll({ order: [['is_default', 'DESC']] }),
      WarehouseStock.findAll({
        include: [
          { model: Warehouse, as: 'warehouse', attributes: ['id', 'name', 'code'] },
          {
            model: ProductVariant,
            as: 'variant',
            include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'slug', 'sku'] }],
          },
        ],
        order: [['quantity_on_hand', 'ASC']],
      }),
      StockMovement.findAll({
        include: [
          { model: Warehouse, as: 'warehouse', attributes: ['name', 'code'] },
          {
            model: ProductVariant,
            as: 'variant',
            include: [{ model: Product, as: 'product', attributes: ['name'] }],
          },
        ],
        order: [['created_at', 'DESC']],
        limit: 40,
      }),
    ]);

    const lowStockAlerts = stocks.filter((s) => s.quantity_on_hand <= s.reorder_level);

    return sendSuccess(res, {
      warehouses,
      stocks,
      low_stock_alerts: lowStockAlerts,
      movements,
    });
  } catch (err) {
    return next(err);
  }
};

const adjustStock = async (req, res, next) => {
  try {
    const { warehouse_id, variant_id, movement_type, quantity_delta, notes } = req.body;

    const result = await sequelize.transaction(async (transaction) => {
      const variant = await ProductVariant.findByPk(variant_id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!variant) throw new AppError('Variant not found', 404, 'NOT_FOUND');

      const [stock] = await WarehouseStock.findOrCreate({
        where: { warehouse_id, variant_id },
        defaults: { warehouse_id, variant_id, quantity_on_hand: variant.stock_qty, reorder_level: variant.low_stock_threshold },
        transaction,
      });

      const nextWarehouseQty = stock.quantity_on_hand + quantity_delta;
      const nextVariantQty = variant.stock_qty + quantity_delta;

      if (nextWarehouseQty < 0 || nextVariantQty < 0) {
        throw new AppError('Stock quantity cannot go below zero', 400, 'NEGATIVE_STOCK');
      }

      await stock.update({ quantity_on_hand: nextWarehouseQty }, { transaction });
      await variant.update({ stock_qty: nextVariantQty }, { transaction });

      const movement = await StockMovement.create(
        {
          warehouse_id,
          variant_id,
          movement_type,
          quantity_delta,
          reference_type: 'manual_adjustment',
          notes: notes || null,
          performed_by: req.user.id,
        },
        { transaction }
      );

      await recordAuditLog({
        actorId: req.user.id,
        action: 'STOCK_ADJUSTED',
        entityType: 'product_variant',
        entityId: variant.id,
        newValues: { movement_type, quantity_delta, nextVariantQty, notes },
        ipAddress: req.ip,
        transaction,
      });

      return { stock, variant, movement };
    });

    return sendSuccess(res, result, 'Stock adjusted successfully');
  } catch (err) {
    return next(err);
  }
};

const uploadMediaBinary = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('Image file is required', 400, 'FILE_REQUIRED'));
    }

    if (!hasValidMagicBytes(req.file.buffer, req.file.mimetype)) {
      return next(new AppError('File signature does not match declared image type', 400, 'INVALID_MAGIC_BYTES'));
    }

    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180);
    const media = await MediaFile.create({
      filename: safeName,
      mime_type: req.file.mimetype,
      size_bytes: req.file.size,
      data: req.file.buffer,
      uploaded_by: req.user.id,
    });

    return sendSuccess(
      res,
      {
        id: media.id,
        filename: media.filename,
        mime_type: media.mime_type,
        size_bytes: media.size_bytes,
        url: `/api/media/${media.id}`,
      },
      'Media stored securely in MySQL',
      201
    );
  } catch (err) {
    return next(err);
  }
};

const serveMediaBinary = async (req, res, next) => {
  try {
    const media = await MediaFile.findByPk(req.params.id);
    if (!media) {
      return next(new AppError('Media file not found', 404, 'NOT_FOUND'));
    }
    res.setHeader('Content-Type', media.mime_type);
    res.setHeader('Content-Length', media.size_bytes);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.send(media.data);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getInventoryOverview,
  adjustStock,
  uploadMediaBinary,
  serveMediaBinary,
};
