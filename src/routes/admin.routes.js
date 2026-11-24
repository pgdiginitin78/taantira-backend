const express = require('express');
const adminController = require('../controllers/admin.controller');
const inventoryController = require('../controllers/inventory.controller');
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth');
const { requireRoles, requireAdminAccess, requirePermissions } = require('../middleware/rbac');
const { upload } = require('../middleware/upload');
const { validate } = require('../middleware/validate');
const { stockAdjustSchema } = require('../validators/catalogue.validators');
const { supportTicketSchema, supportReplySchema } = require('../validators/delivery.validators');

const adminRouter = express.Router();
adminRouter.use(authenticate, requireAdminAccess);
adminRouter.get('/dashboard', requirePermissions('admin.dashboard.view'), adminController.getDashboardAnalytics);
adminRouter.get('/customers', requirePermissions('customers.manage'), adminController.listCustomersAdmin);
adminRouter.get('/staff', requirePermissions('settings.manage'), adminController.listStaffAndRoles);
adminRouter.post('/staff', requirePermissions('settings.manage'), adminController.createStaffUser);
adminRouter.get('/settings', requirePermissions('settings.manage'), adminController.getSettingsAdmin);
adminRouter.put('/settings', requirePermissions('settings.manage'), adminController.updateSettingsAdmin);
adminRouter.get('/audit-logs', requirePermissions('settings.manage'), adminController.listAuditLogs);
adminRouter.get('/marketing', requirePermissions('marketing.manage'), adminController.getMarketingAssets);
adminRouter.post('/marketing/banners', requirePermissions('marketing.manage'), adminController.createBanner);
adminRouter.post('/marketing/campaigns', requirePermissions('marketing.manage'), adminController.createCampaign);

const inventoryRouter = express.Router();
inventoryRouter.use(authenticate, requirePermissions('inventory.manage'));
inventoryRouter.get('/', inventoryController.getInventoryOverview);
inventoryRouter.post('/adjust', validate(stockAdjustSchema), inventoryController.adjustStock);

const mediaRouter = express.Router();
mediaRouter.get('/:id', inventoryController.serveMediaBinary);
mediaRouter.post('/upload', authenticate, requireRoles('super_admin'), upload.single('file'), inventoryController.uploadMediaBinary);

const reportsRouter = express.Router();
reportsRouter.use(authenticate, requirePermissions('reports.view'));
reportsRouter.get('/summary', adminController.getDetailedReports);
reportsRouter.get('/export/:type', adminController.exportReportCsv);

const supportRouter = express.Router();
supportRouter.use(authenticate);
supportRouter.get('/', adminController.listTickets);
supportRouter.post('/', validate(supportTicketSchema), adminController.createTicket);
supportRouter.post('/:id/messages', validate(supportReplySchema), adminController.replyTicket);

const notificationsRouter = express.Router();
notificationsRouter.use(authenticate);
notificationsRouter.get('/', userController.listNotifications);
notificationsRouter.put('/:id/read', userController.markNotificationRead);

module.exports = {
  adminRouter,
  inventoryRouter,
  mediaRouter,
  reportsRouter,
  supportRouter,
  notificationsRouter,
};
