const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const { productsRouter, categoriesRouter, collectionsRouter, reviewsRouter } = require('./catalogue.routes');
const { cartRouter, couponsRouter } = require('./cart.routes');
const { checkoutRouter, ordersRouter, paymentsRouter, refundsRouter, returnsRouter } = require('./order.routes');
const { deliveryRouter, trackingRouter, shippingRouter } = require('./delivery.routes');
const { adminRouter, inventoryRouter, mediaRouter, reportsRouter, supportRouter, notificationsRouter } = require('./admin.routes');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Taantira API is running',
  });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/products', productsRouter);
router.use('/categories', categoriesRouter);
router.use('/collections', collectionsRouter);
router.use('/reviews', reviewsRouter);
router.use('/cart', cartRouter);
router.use('/coupons', couponsRouter);
router.use('/checkout', checkoutRouter);
router.use('/orders', ordersRouter);
router.use('/payments', paymentsRouter);
router.use('/refunds', refundsRouter);
router.use('/returns', returnsRouter);
router.use('/delivery', deliveryRouter);
router.use('/tracking', trackingRouter);
router.use('/shipping', shippingRouter);
router.use('/admin', adminRouter);
router.use('/inventory', inventoryRouter);
router.use('/media', mediaRouter);
router.use('/reports', reportsRouter);
router.use('/support', supportRouter);
router.use('/notifications', notificationsRouter);

module.exports = router;
