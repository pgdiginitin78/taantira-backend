const {
  Coupon,
  CouponUsage,
  DeliveryZonePincode,
  DeliveryZone,
  SystemSetting,
} = require('../models');
const { AppError } = require('../utils/errors');

const roundCurrency = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const ADDON_FEES = {
  matching_blouse: 1200,
  petticoat: 650,
  gift_wrap: 150,
  gift_box: 350,
  tote_bag: 290,
};

const getPublicSettingsMap = async () => {
  const rows = await SystemSetting.findAll();
  const map = {};
  for (const row of rows) {
    map[row.setting_key] = row.setting_value;
  }
  return {
    freeShippingThreshold: Number(map.free_shipping_threshold ?? 2999),
    defaultShippingFee: Number(map.default_shipping_fee ?? 149),
    defaultTaxRate: Number(map.default_tax_rate ?? 12),
    upiVpa: map.upi_vpa || 'taantira.atelier@upi',
    upiPayeeName: map.upi_payee_name || 'Taantira Handloom & Couture Atelier',
  };
};

const calculateCustomOptionFee = (customOptions = {}, category = {}) => {
  if (!customOptions || typeof customOptions !== 'object') return 0;
  let extra = 0;
  if (customOptions.matching_blouse && category.supports_blouse_option) {
    extra += ADDON_FEES.matching_blouse;
  }
  if (customOptions.petticoat && category.supports_petticoat_option) {
    extra += ADDON_FEES.petticoat;
  }
  if (category.supports_gift_options !== false) {
    if (customOptions.gift_wrap) extra += ADDON_FEES.gift_wrap;
    if (customOptions.gift_box) extra += ADDON_FEES.gift_box;
    if (customOptions.tote_bag) extra += ADDON_FEES.tote_bag;
  }
  return roundCurrency(extra);
};

const evaluateCoupon = async ({ code, userId = null, lineItems = [], subtotal = 0 }) => {
  if (!code) return { coupon: null, discountAmount: 0 };

  const normalized = String(code).trim().toUpperCase();
  const coupon = await Coupon.findOne({
    where: { code: normalized, is_active: true },
    include: [
      { association: 'restrictedProducts', attributes: ['id'], through: { attributes: [] } },
      { association: 'restrictedCategories', attributes: ['id'], through: { attributes: [] } },
    ],
  });

  if (!coupon) {
    throw new AppError('Invalid or inactive coupon code', 400, 'INVALID_COUPON');
  }

  const now = new Date();
  if (now < new Date(coupon.starts_at) || now > new Date(coupon.expires_at)) {
    throw new AppError('This coupon has expired or is not active yet', 400, 'COUPON_EXPIRED');
  }

  if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
    throw new AppError('Coupon usage limit reached', 400, 'COUPON_LIMIT_REACHED');
  }

  if (userId) {
    const userUses = await CouponUsage.count({
      where: { coupon_id: coupon.id, user_id: userId },
    });
    if (userUses >= coupon.per_customer_limit) {
      throw new AppError('You have already reached the usage limit for this coupon', 400, 'COUPON_USER_LIMIT');
    }
  }

  if (subtotal < Number(coupon.min_purchase_amount)) {
    throw new AppError(
      `Minimum purchase of Rs ${Number(coupon.min_purchase_amount).toFixed(0)} required for ${coupon.code}`,
      400,
      'COUPON_MIN_PURCHASE'
    );
  }

  const prodIds = new Set((coupon.restrictedProducts || []).map((p) => Number(p.id)));
  const catIds = new Set((coupon.restrictedCategories || []).map((c) => Number(c.id)));
  const hasRestrictions = prodIds.size > 0 || catIds.size > 0;

  let eligibleSubtotal = subtotal;
  if (hasRestrictions) {
    eligibleSubtotal = lineItems.reduce((sum, item) => {
      const matchesProd = prodIds.has(Number(item.product_id));
      const matchesCat = catIds.has(Number(item.primary_category_id));
      return matchesProd || matchesCat ? sum + item.line_subtotal : sum;
    }, 0);
    if (eligibleSubtotal <= 0) {
      throw new AppError('Coupon is not applicable to the items in your bag', 400, 'COUPON_NOT_APPLICABLE');
    }
  }

  let discountAmount = 0;
  if (coupon.discount_type === 'percentage') {
    discountAmount = (eligibleSubtotal * Number(coupon.discount_value)) / 100;
  } else {
    discountAmount = Math.min(Number(coupon.discount_value), eligibleSubtotal);
  }

  if (coupon.max_discount_amount) {
    discountAmount = Math.min(discountAmount, Number(coupon.max_discount_amount));
  }

  return {
    coupon,
    discountAmount: roundCurrency(discountAmount),
  };
};

const calculateShippingForPincode = async ({ pincode = null, subtotalAfterDiscount = 0, settings = null }) => {
  const activeSettings = settings || (await getPublicSettingsMap());
  if (subtotalAfterDiscount >= activeSettings.freeShippingThreshold) {
    return { shippingFee: 0, zone: null, isServiceable: true, codAvailable: true };
  }

  if (pincode) {
    const pinRecord = await DeliveryZonePincode.findOne({
      where: { pincode: String(pincode).trim() },
      include: [{ model: DeliveryZone, as: 'zone' }],
    });
    if (pinRecord && pinRecord.zone && pinRecord.zone.is_active) {
      return {
        shippingFee: roundCurrency(pinRecord.zone.base_fee),
        zone: pinRecord.zone,
        isServiceable: pinRecord.is_serviceable,
        codAvailable: pinRecord.cod_available,
      };
    }
  }

  return {
    shippingFee: roundCurrency(activeSettings.defaultShippingFee),
    zone: null,
    isServiceable: true,
    codAvailable: true,
  };
};

const computeCartTotals = async ({ cartItems = [], couponCode = null, userId = null, pincode = null }) => {
  const settings = await getPublicSettingsMap();
  const lineItems = [];
  let subtotal = 0;
  let totalTax = 0;

  for (const item of cartItems) {
    const product = item.product;
    const variant = item.variant;
    if (!product || !variant) continue;

    const baseUnit = variant.price_override || product.sale_price || product.base_price;
    const addonFee = calculateCustomOptionFee(item.custom_options_json, product.primaryCategory || {});
    const unitPrice = roundCurrency(Number(baseUnit) + addonFee);
    const lineSubtotal = roundCurrency(unitPrice * item.quantity);
    const taxRate = Number(product.tax_rate ?? settings.defaultTaxRate);
    const lineTax = roundCurrency((lineSubtotal * taxRate) / 100);

    subtotal = roundCurrency(subtotal + lineSubtotal);
    totalTax = roundCurrency(totalTax + lineTax);

    lineItems.push({
      cart_item_id: item.id,
      product_id: product.id,
      variant_id: variant.id,
      primary_category_id: product.primary_category_id,
      product_name: product.name,
      sku: variant.sku,
      size: variant.size,
      color_name: variant.color_name,
      quantity: item.quantity,
      unit_price: unitPrice,
      addon_fee: addonFee,
      line_subtotal: lineSubtotal,
      tax_rate: taxRate,
      tax_amount: lineTax,
      total_price: roundCurrency(lineSubtotal + lineTax),
      custom_options_json: item.custom_options_json || null,
      image_url: product.images?.[0]?.image_url || null,
    });
  }

  let couponResult = { coupon: null, discountAmount: 0 };
  if (couponCode && subtotal > 0) {
    couponResult = await evaluateCoupon({
      code: couponCode,
      userId,
      lineItems,
      subtotal,
    });
  }

  const subtotalAfterDiscount = Math.max(0, roundCurrency(subtotal - couponResult.discountAmount));
  // Proportionally reduce tax if discount applied
  const discountRatio = subtotal > 0 ? subtotalAfterDiscount / subtotal : 1;
  const adjustedTax = roundCurrency(totalTax * discountRatio);

  const shippingInfo = await calculateShippingForPincode({
    pincode,
    subtotalAfterDiscount,
    settings,
  });

  const finalTotal = roundCurrency(subtotalAfterDiscount + adjustedTax + shippingInfo.shippingFee);

  return {
    lineItems,
    subtotal,
    discountAmount: couponResult.discountAmount,
    coupon: couponResult.coupon
      ? {
          id: couponResult.coupon.id,
          code: couponResult.coupon.code,
          discount_type: couponResult.coupon.discount_type,
          discount_value: Number(couponResult.coupon.discount_value),
        }
      : null,
    taxAmount: adjustedTax,
    shippingFee: shippingInfo.shippingFee,
    totalAmount: finalTotal,
    isServiceable: shippingInfo.isServiceable,
    codAvailable: shippingInfo.codAvailable,
    upiVpa: settings.upiVpa,
    upiPayeeName: settings.upiPayeeName,
    freeShippingThreshold: settings.freeShippingThreshold,
  };
};

module.exports = {
  ADDON_FEES,
  roundCurrency,
  calculateCustomOptionFee,
  evaluateCoupon,
  calculateShippingForPincode,
  computeCartTotals,
  getPublicSettingsMap,
};
