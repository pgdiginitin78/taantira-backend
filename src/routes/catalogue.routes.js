const express = require('express');
const catalogueController = require('../controllers/catalogue.controller');
const { authenticate } = require('../middleware/auth');
const { requireRoles, requirePermissions } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const {
  productSchema,
  productUpdateSchema,
  variantSchema,
  categorySchema,
  collectionSchema,
  reviewSchema,
  questionSchema,
  answerSchema,
} = require('../validators/catalogue.validators');

const productsRouter = express.Router();
productsRouter.get('/homepage', catalogueController.getHomepage);
productsRouter.get('/search/suggestions', catalogueController.searchSuggestions);
productsRouter.get('/', catalogueController.listProducts);
productsRouter.get('/:slug', catalogueController.getProductBySlug);
productsRouter.post('/:id/questions', authenticate, validate(questionSchema), catalogueController.askProductQuestion);
productsRouter.put(
  '/questions/:questionId/answer',
  authenticate,
  requirePermissions('catalogue.manage'),
  validate(answerSchema),
  catalogueController.answerProductQuestion
);
productsRouter.post('/', authenticate, requireRoles('super_admin'), validate(productSchema), catalogueController.createProduct);
productsRouter.put('/:id', authenticate, requireRoles('super_admin'), validate(productUpdateSchema), catalogueController.updateProduct);
productsRouter.delete('/:id', authenticate, requireRoles('super_admin'), catalogueController.deleteProduct);
productsRouter.post('/:id/variants', authenticate, requireRoles('super_admin'), validate(variantSchema), catalogueController.addVariant);

const categoriesRouter = express.Router();
categoriesRouter.get('/', catalogueController.listCategories);
categoriesRouter.post('/', authenticate, requireRoles('super_admin'), validate(categorySchema), catalogueController.createCategory);
categoriesRouter.put('/:id', authenticate, requireRoles('super_admin'), validate(categorySchema), catalogueController.updateCategory);
categoriesRouter.delete('/:id', authenticate, requireRoles('super_admin'), catalogueController.deleteCategory);

const collectionsRouter = express.Router();
collectionsRouter.get('/', catalogueController.listCollections);
collectionsRouter.post('/', authenticate, requireRoles('super_admin'), validate(collectionSchema), catalogueController.createCollection);

const reviewsRouter = express.Router();
reviewsRouter.post('/', authenticate, validate(reviewSchema), catalogueController.createReview);

module.exports = { productsRouter, categoriesRouter, collectionsRouter, reviewsRouter };
