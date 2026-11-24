const { Sequelize } = require('sequelize');
const sequelize = require('./sequelize');

const authModels = require('./auth.models')(sequelize);
const customerModels = require('./customer.models')(sequelize);
const catalogueModels = require('./catalogue.models')(sequelize);
const inventoryModels = require('./inventory.models')(sequelize);
const shoppingModels = require('./shopping.models')(sequelize);
const orderModels = require('./order.models')(sequelize);
const paymentModels = require('./payment.models')(sequelize);
const returnModels = require('./return.models')(sequelize);
const deliveryModels = require('./delivery.models')(sequelize);
const platformModels = require('./platform.models')(sequelize);

const models = {
  ...authModels,
  ...customerModels,
  ...catalogueModels,
  ...inventoryModels,
  ...shoppingModels,
  ...orderModels,
  ...paymentModels,
  ...returnModels,
  ...deliveryModels,
  ...platformModels,
};

const {
  User,
  Role,
  Permission,
  UserRole,
  RolePermission,
  RefreshToken,
  CustomerProfile,
  CustomerAddress,
  Wishlist,
  WishlistItem,
  Category,
  Product,
  ProductCategory,
  Collection,
  CollectionProduct,
  ProductImage,
  ProductVariant,
  ProductAttribute,
  AttributeValue,
  ProductReview,
  ProductQuestion,
  Warehouse,
  WarehouseStock,
  StockMovement,
  StockReservation,
  Cart,
  CartItem,
  Coupon,
  CouponProduct,
  CouponCategory,
  CouponUsage,
  Order,
  OrderItem,
  OrderAddress,
  OrderStatusHistory,
  OrderCancellation,
  Payment,
  PaymentTransaction,
  Refund,
  RefundItem,
  PaymentReconciliation,
  ReturnRequest,
  ReturnItem,
  ExchangeRequest,
  ReturnPickup,
  DeliveryPartner,
  DeliveryDocument,
  DeliveryVehicle,
  DeliveryZone,
  DeliveryZonePincode,
  DeliveryAssignment,
  DeliveryStatusHistory,
  DeliveryPartnerCurrentLocation,
  DeliveryLocationHistory,
  DeliveryProof,
  CourierShipment,
  CourierTrackingEvent,
  DeliveryEarning,
  DeliverySettlement,
  Notification,
  SupportTicket,
  SupportMessage,
  AdminAuditLog,
} = models;

// Auth & RBAC
User.belongsToMany(Role, { through: UserRole, foreignKey: 'user_id', otherKey: 'role_id', as: 'roles' });
Role.belongsToMany(User, { through: UserRole, foreignKey: 'role_id', otherKey: 'user_id', as: 'users' });
Role.belongsToMany(Permission, { through: RolePermission, foreignKey: 'role_id', otherKey: 'permission_id', as: 'permissions' });
Permission.belongsToMany(Role, { through: RolePermission, foreignKey: 'permission_id', otherKey: 'role_id', as: 'roles' });
User.hasMany(RefreshToken, { foreignKey: 'user_id', as: 'refreshTokens' });
RefreshToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Customer
User.hasOne(CustomerProfile, { foreignKey: 'user_id', as: 'customerProfile' });
CustomerProfile.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(CustomerAddress, { foreignKey: 'user_id', as: 'addresses' });
CustomerAddress.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasOne(Wishlist, { foreignKey: 'user_id', as: 'wishlist' });
Wishlist.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Wishlist.hasMany(WishlistItem, { foreignKey: 'wishlist_id', as: 'items' });
WishlistItem.belongsTo(Wishlist, { foreignKey: 'wishlist_id', as: 'wishlist' });
WishlistItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
WishlistItem.belongsTo(ProductVariant, { foreignKey: 'variant_id', as: 'variant' });

// Catalogue
Category.hasMany(Category, { foreignKey: 'parent_id', as: 'children' });
Category.belongsTo(Category, { foreignKey: 'parent_id', as: 'parent' });
Category.hasMany(Product, { foreignKey: 'primary_category_id', as: 'primaryProducts' });
Product.belongsTo(Category, { foreignKey: 'primary_category_id', as: 'primaryCategory' });
Product.belongsToMany(Category, { through: ProductCategory, foreignKey: 'product_id', otherKey: 'category_id', as: 'categories' });
Category.belongsToMany(Product, { through: ProductCategory, foreignKey: 'category_id', otherKey: 'product_id', as: 'products' });
Collection.belongsToMany(Product, { through: CollectionProduct, foreignKey: 'collection_id', otherKey: 'product_id', as: 'products' });
Product.belongsToMany(Collection, { through: CollectionProduct, foreignKey: 'product_id', otherKey: 'collection_id', as: 'collections' });
Product.hasMany(ProductImage, { foreignKey: 'product_id', as: 'images' });
ProductImage.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
Product.hasMany(ProductVariant, { foreignKey: 'product_id', as: 'variants' });
ProductVariant.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
Product.hasMany(AttributeValue, { foreignKey: 'product_id', as: 'attributeValues' });
AttributeValue.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
AttributeValue.belongsTo(ProductAttribute, { foreignKey: 'attribute_id', as: 'attribute' });
Product.hasMany(ProductReview, { foreignKey: 'product_id', as: 'reviews' });
ProductReview.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
ProductReview.belongsTo(User, { foreignKey: 'user_id', as: 'author' });
Product.hasMany(ProductQuestion, { foreignKey: 'product_id', as: 'questions' });
ProductQuestion.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
ProductQuestion.belongsTo(User, { foreignKey: 'user_id', as: 'askedBy' });

// Inventory
Warehouse.hasMany(WarehouseStock, { foreignKey: 'warehouse_id', as: 'stockItems' });
WarehouseStock.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });
ProductVariant.hasMany(WarehouseStock, { foreignKey: 'variant_id', as: 'warehouseStocks' });
WarehouseStock.belongsTo(ProductVariant, { foreignKey: 'variant_id', as: 'variant' });
StockMovement.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });
StockMovement.belongsTo(ProductVariant, { foreignKey: 'variant_id', as: 'variant' });
StockReservation.belongsTo(ProductVariant, { foreignKey: 'variant_id', as: 'variant' });

// Shopping
User.hasMany(Cart, { foreignKey: 'user_id', as: 'carts' });
Cart.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Cart.belongsTo(Coupon, { foreignKey: 'coupon_id', as: 'coupon' });
Cart.hasMany(CartItem, { foreignKey: 'cart_id', as: 'items' });
CartItem.belongsTo(Cart, { foreignKey: 'cart_id', as: 'cart' });
CartItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
CartItem.belongsTo(ProductVariant, { foreignKey: 'variant_id', as: 'variant' });
Coupon.belongsToMany(Product, { through: CouponProduct, foreignKey: 'coupon_id', otherKey: 'product_id', as: 'restrictedProducts' });
Coupon.belongsToMany(Category, { through: CouponCategory, foreignKey: 'coupon_id', otherKey: 'category_id', as: 'restrictedCategories' });
Coupon.hasMany(CouponUsage, { foreignKey: 'coupon_id', as: 'usages' });
CouponUsage.belongsTo(Coupon, { foreignKey: 'coupon_id', as: 'coupon' });

// Orders
User.hasMany(Order, { foreignKey: 'user_id', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'user_id', as: 'customer' });
Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
OrderItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
OrderItem.belongsTo(ProductVariant, { foreignKey: 'variant_id', as: 'variant' });
Order.hasOne(OrderAddress, { foreignKey: 'order_id', as: 'shippingAddress' });
OrderAddress.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
Order.hasMany(OrderStatusHistory, { foreignKey: 'order_id', as: 'statusHistory' });
OrderStatusHistory.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
Order.hasOne(OrderCancellation, { foreignKey: 'order_id', as: 'cancellation' });
OrderCancellation.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

// Payments & Refunds
Order.hasMany(Payment, { foreignKey: 'order_id', as: 'payments' });
Payment.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
Payment.hasMany(PaymentTransaction, { foreignKey: 'payment_id', as: 'transactions' });
PaymentTransaction.belongsTo(Payment, { foreignKey: 'payment_id', as: 'payment' });
User.hasMany(Refund, { foreignKey: 'user_id', as: 'refunds' });
Refund.belongsTo(User, { foreignKey: 'user_id', as: 'customer' });
Order.hasMany(Refund, { foreignKey: 'order_id', as: 'refunds' });
Refund.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
Refund.belongsTo(Payment, { foreignKey: 'payment_id', as: 'payment' });
Refund.hasMany(RefundItem, { foreignKey: 'refund_id', as: 'items' });
RefundItem.belongsTo(Refund, { foreignKey: 'refund_id', as: 'refund' });
PaymentReconciliation.belongsTo(Payment, { foreignKey: 'payment_id', as: 'payment' });
PaymentReconciliation.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

// Returns
Order.hasMany(ReturnRequest, { foreignKey: 'order_id', as: 'returnRequests' });
ReturnRequest.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
ReturnRequest.belongsTo(User, { foreignKey: 'user_id', as: 'customer' });
ReturnRequest.hasMany(ReturnItem, { foreignKey: 'return_request_id', as: 'items' });
ReturnItem.belongsTo(ReturnRequest, { foreignKey: 'return_request_id', as: 'returnRequest' });
ReturnItem.belongsTo(OrderItem, { foreignKey: 'order_item_id', as: 'orderItem' });
ReturnRequest.hasOne(ExchangeRequest, { foreignKey: 'return_request_id', as: 'exchangeRequest' });
ReturnRequest.hasOne(ReturnPickup, { foreignKey: 'return_request_id', as: 'pickup' });

// Delivery & Courier
User.hasOne(DeliveryPartner, { foreignKey: 'user_id', as: 'deliveryPartner' });
DeliveryPartner.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
DeliveryPartner.hasMany(DeliveryDocument, { foreignKey: 'delivery_partner_id', as: 'documents' });
DeliveryDocument.belongsTo(DeliveryPartner, { foreignKey: 'delivery_partner_id', as: 'partner' });
DeliveryPartner.hasMany(DeliveryVehicle, { foreignKey: 'delivery_partner_id', as: 'vehicles' });
DeliveryVehicle.belongsTo(DeliveryPartner, { foreignKey: 'delivery_partner_id', as: 'partner' });
DeliveryZone.hasMany(DeliveryZonePincode, { foreignKey: 'delivery_zone_id', as: 'pincodes' });
DeliveryZonePincode.belongsTo(DeliveryZone, { foreignKey: 'delivery_zone_id', as: 'zone' });
Order.hasMany(DeliveryAssignment, { foreignKey: 'order_id', as: 'deliveryAssignments' });
DeliveryAssignment.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
DeliveryPartner.hasMany(DeliveryAssignment, { foreignKey: 'delivery_partner_id', as: 'assignments' });
DeliveryAssignment.belongsTo(DeliveryPartner, { foreignKey: 'delivery_partner_id', as: 'partner' });
DeliveryAssignment.hasMany(DeliveryStatusHistory, { foreignKey: 'delivery_assignment_id', as: 'statusHistory' });
DeliveryAssignment.hasOne(DeliveryProof, { foreignKey: 'delivery_assignment_id', as: 'proof' });
DeliveryPartner.hasOne(DeliveryPartnerCurrentLocation, { foreignKey: 'delivery_partner_id', as: 'currentLocation' });
DeliveryPartnerCurrentLocation.belongsTo(DeliveryPartner, { foreignKey: 'delivery_partner_id', as: 'partner' });
DeliveryPartner.hasMany(DeliveryLocationHistory, { foreignKey: 'delivery_partner_id', as: 'locationHistory' });
Order.hasOne(CourierShipment, { foreignKey: 'order_id', as: 'courierShipment' });
CourierShipment.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
CourierShipment.hasMany(CourierTrackingEvent, { foreignKey: 'courier_shipment_id', as: 'events' });
CourierTrackingEvent.belongsTo(CourierShipment, { foreignKey: 'courier_shipment_id', as: 'shipment' });
DeliveryPartner.hasMany(DeliveryEarning, { foreignKey: 'delivery_partner_id', as: 'earnings' });
DeliveryEarning.belongsTo(DeliveryPartner, { foreignKey: 'delivery_partner_id', as: 'partner' });
DeliveryPartner.hasMany(DeliverySettlement, { foreignKey: 'delivery_partner_id', as: 'settlements' });
DeliverySettlement.belongsTo(DeliveryPartner, { foreignKey: 'delivery_partner_id', as: 'partner' });

// Marketing, Notifications & Support
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(SupportTicket, { foreignKey: 'user_id', as: 'supportTickets' });
SupportTicket.belongsTo(User, { foreignKey: 'user_id', as: 'customer' });
SupportTicket.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
SupportTicket.hasMany(SupportMessage, { foreignKey: 'ticket_id', as: 'messages' });
SupportMessage.belongsTo(SupportTicket, { foreignKey: 'ticket_id', as: 'ticket' });
SupportMessage.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });
AdminAuditLog.belongsTo(User, { foreignKey: 'actor_id', as: 'actor' });

module.exports = {
  sequelize,
  Sequelize,
  ...models,
};
