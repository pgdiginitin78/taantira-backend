const express = require('express');
const cartController = require('../controllers/cart.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermissions } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const {
  cartItemAddSchema,
  cartItemUpdateSchema,
  couponApplySchema,
  couponCreateSchema,
} = require('../validators/order.validators');

const cartRouter = express.Router();
cartRouter.use(authenticate);
cartRouter.get('/', cartController.getCart);
cartRouter.post('/items', validate(cartItemAddSchema), cartController.addCartItem);
cartRouter.put('/items/:itemId', validate(cartItemUpdateSchema), cartController.updateCartItem);
cartRouter.delete('/items/:itemId', cartController.removeCartItem);
cartRouter.post('/items/:itemId/move-to-wishlist', cartController.moveCartItemToWishlist);
cartRouter.post('/coupon', validate(couponApplySchema), cartController.applyCouponToCart);
cartRouter.delete('/coupon', cartController.removeCouponFromCart);

const couponsRouter = express.Router();
couponsRouter.get('/', authenticate, requirePermissions('marketing.manage'), cartController.listCoupons);
couponsRouter.post('/', authenticate, requirePermissions('marketing.manage'), validate(couponCreateSchema), cartController.createCoupon);
couponsRouter.put('/:id', authenticate, requirePermissions('marketing.manage'), cartController.updateCoupon);

module.exports = { cartRouter, couponsRouter };
