const express = require('express');
const rateLimit = require('express-rate-limit');
const deliveryController = require('../controllers/delivery.controller');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { requireRoles, requirePermissions } = require('../middleware/rbac');
const { ROLES } = require('../config/constants');
const { validate } = require('../middleware/validate');
const {
  partnerRegisterSchema,
  partnerVerifySchema,
  partnerAvailabilitySchema,
  assignPartnerSchema,
  assignmentRespondSchema,
  locationUpdateSchema,
  completeDeliveryOtpSchema,
  deliveryZoneSchema,
  courierBookSchema,
  courierEventSchema,
  settlementSchema,
} = require('../validators/delivery.validators');

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  message: { success: false, message: 'Too many OTP verification attempts', code: 'OTP_RATE_LIMITED' },
});

const deliveryRouter = express.Router();
deliveryRouter.post('/partners/register', optionalAuth, validate(partnerRegisterSchema), deliveryController.registerPartner);
deliveryRouter.get('/zones', deliveryController.listZones);

deliveryRouter.use(authenticate);
deliveryRouter.get('/partners', requirePermissions('delivery.manage'), deliveryController.listPartnersAdmin);
deliveryRouter.put('/partners/:id/verify', requirePermissions('delivery.manage'), validate(partnerVerifySchema), deliveryController.verifyPartnerAdmin);
deliveryRouter.post('/zones', requirePermissions('delivery.manage'), validate(deliveryZoneSchema), deliveryController.createZone);
deliveryRouter.post('/assign', requirePermissions('delivery.manage'), validate(assignPartnerSchema), deliveryController.assignOrderToPartner);
deliveryRouter.post('/settlements', requirePermissions('delivery.manage'), validate(settlementSchema), deliveryController.settlePartnerEarnings);

// Partner self-service portal routes
deliveryRouter.get('/partner/dashboard', requireRoles(ROLES.DELIVERY_PARTNER), deliveryController.getPartnerDashboard);
deliveryRouter.put('/partner/availability', requireRoles(ROLES.DELIVERY_PARTNER), validate(partnerAvailabilitySchema), deliveryController.toggleAvailability);
deliveryRouter.post('/assignments/:id/respond', requireRoles(ROLES.DELIVERY_PARTNER), validate(assignmentRespondSchema), deliveryController.respondToAssignment);
deliveryRouter.post('/assignments/:id/pickup', requireRoles(ROLES.DELIVERY_PARTNER), deliveryController.confirmPickup);
deliveryRouter.post('/assignments/:id/start', requireRoles(ROLES.DELIVERY_PARTNER), deliveryController.startDelivery);
deliveryRouter.post('/assignments/:id/complete', otpLimiter, requireRoles(ROLES.DELIVERY_PARTNER), validate(completeDeliveryOtpSchema), deliveryController.completeDeliveryOtp);

const trackingRouter = express.Router();
trackingRouter.use(authenticate);
trackingRouter.post('/location', requireRoles(ROLES.DELIVERY_PARTNER), validate(locationUpdateSchema), deliveryController.updatePartnerLocation);
trackingRouter.get('/fleet/active', requirePermissions('delivery.manage'), deliveryController.getActiveFleetTrackingAdmin);
trackingRouter.get('/orders/:orderId', deliveryController.getOrderTracking);

const shippingRouter = express.Router();
shippingRouter.use(authenticate);
shippingRouter.post('/couriers', requirePermissions('delivery.manage'), validate(courierBookSchema), deliveryController.bookCourierShipment);
shippingRouter.post('/couriers/:shipmentId/events', requirePermissions('delivery.manage'), validate(courierEventSchema), deliveryController.addCourierEvent);

module.exports = { deliveryRouter, trackingRouter, shippingRouter };
