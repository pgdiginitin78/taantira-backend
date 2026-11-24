const express = require('express');
const catalogueController = require('../controllers/catalogue.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermissions } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const {
  productSchema,
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
productsRouter.post('/', authenticate, requirePermissions('catalogue.manage'), validate(productSchema), catalogueController.createProduct);
productsRouter.put('/:id', authenticate, requirePermissions('catalogue.manage'), catalogueController.updateProduct);
productsRouter.post('/:id/variants', authenticate, requirePermissions('catalogue.manage'), validate(variantSchema), catalogueController.addVariant);

const categoriesRouter = express.Router();
categoriesRouter.get('/', catalogueController.listCategories);
categoriesRouter.post('/', authenticate, requirePermissions('catalogue.manage'), validate(categorySchema), catalogueController.createCategory);
categoriesRouter.put('/:id', authenticate, requirePermissions('catalogue.manage'), validate(categorySchema), catalogueController.updateCategory);

const collectionsRouter = express.Router();
collectionsRouter.get('/', catalogueController.listCollections);
collectionsRouter.post('/', authenticate, requirePermissions('catalogue.manage'), validate(collectionSchema), catalogueController.createCollection);

const reviewsRouter = express.Router();
reviewsRouter.post('/', authenticate, validate(reviewSchema), catalogueController.createReview);

module.exports = { productsRouter, categoriesRouter, collectionsRouter, reviewsRouter };
