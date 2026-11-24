const express = require('express');
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { updateProfileSchema, addressSchema } = require('../validators/auth.validators');
const { newsletterSchema } = require('../validators/delivery.validators');

const router = express.Router();

router.post('/newsletter', validate(newsletterSchema), userController.subscribeNewsletter);

router.use(authenticate);
router.get('/dashboard', userController.getDashboard);
router.get('/profile', userController.getProfile);
router.put('/profile', validate(updateProfileSchema), userController.updateProfile);

router.get('/addresses', userController.listAddresses);
router.post('/addresses', validate(addressSchema), userController.createAddress);
router.put('/addresses/:id', validate(addressSchema), userController.updateAddress);
router.delete('/addresses/:id', userController.deleteAddress);

router.get('/wishlist', userController.getWishlist);
router.post('/wishlist/toggle', userController.toggleWishlistItem);

module.exports = router;
