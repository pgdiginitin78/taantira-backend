const express = require('express');
const orderController = require('../controllers/order.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermissions } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const {
  checkoutSchema,
  orderStatusSchema,
  cancellationSchema,
  upiSubmitSchema,
  paymentVerifySchema,
  refundSchema,
  returnRequestSchema,
  returnDecisionSchema,
} = require('../validators/order.validators');

const checkoutRouter = express.Router();
checkoutRouter.get('/pincode/:pincode', orderController.checkPincode);
checkoutRouter.get('/config', orderController.checkoutConfig);
checkoutRouter.post('/', authenticate, validate(checkoutSchema), orderController.checkout);

const ordersRouter = express.Router();
ordersRouter.use(authenticate);
ordersRouter.get('/', orderController.listMyOrders);
ordersRouter.get('/admin/all', requirePermissions('orders.manage'), orderController.listOrdersAdmin);
ordersRouter.get('/:id', orderController.getOrderDetail);
ordersRouter.post('/:id/cancel', validate(cancellationSchema), orderController.cancelOrder);
ordersRouter.put('/:id/status', requirePermissions('orders.manage'), validate(orderStatusSchema), orderController.updateOrderStatusAdmin);

const paymentsRouter = express.Router();
paymentsRouter.use(authenticate);
paymentsRouter.get('/', orderController.listPayments);
paymentsRouter.post('/orders/:orderId/upi-utr', validate(upiSubmitSchema), orderController.submitUpiUtr);
paymentsRouter.put('/:id/verify', requirePermissions('payments.manage'), validate(paymentVerifySchema), orderController.verifyPaymentAdmin);

const refundsRouter = express.Router();
refundsRouter.use(authenticate);
refundsRouter.get('/', orderController.listRefunds);
refundsRouter.post('/', requirePermissions('payments.manage'), validate(refundSchema), orderController.processRefund);

const returnsRouter = express.Router();
returnsRouter.use(authenticate);
returnsRouter.get('/', orderController.listReturns);
returnsRouter.post('/', validate(returnRequestSchema), orderController.createReturnRequest);
returnsRouter.put('/:id/review', requirePermissions('support.manage'), validate(returnDecisionSchema), orderController.reviewReturnAdmin);

module.exports = {
  checkoutRouter,
  ordersRouter,
  paymentsRouter,
  refundsRouter,
  returnsRouter,
};
