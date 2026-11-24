'use strict';

const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const passwordHashCustomer = await bcrypt.hash('TaantiraUser@2026', 10);
    const passwordHashAdmin = await bcrypt.hash('TaantiraAdmin@2026', 10);
    const passwordHashRider = await bcrypt.hash('TaantiraRider@2026', 10);

    // 1. Roles
    const rolesData = [
      { name: 'Customer', slug: 'customer', description: 'Storefront shopper account', is_system: true, created_at: now, updated_at: now },
      { name: 'Delivery Partner', slug: 'delivery_partner', description: 'Own fleet delivery partner', is_system: true, created_at: now, updated_at: now },
      { name: 'Super Admin', slug: 'super_admin', description: 'Full administrative control', is_system: true, created_at: now, updated_at: now },
      { name: 'Catalogue Manager', slug: 'catalogue_manager', description: 'Manage products, categories, collections, reviews', is_system: true, created_at: now, updated_at: now },
      { name: 'Order Manager', slug: 'order_manager', description: 'Manage order lifecycle and cancellations', is_system: true, created_at: now, updated_at: now },
      { name: 'Inventory Manager', slug: 'inventory_manager', description: 'Manage warehouse stock and purchase adjustments', is_system: true, created_at: now, updated_at: now },
      { name: 'Finance Manager', slug: 'finance_manager', description: 'Verify UPI payments, refunds, and reconciliations', is_system: true, created_at: now, updated_at: now },
      { name: 'Marketing Manager', slug: 'marketing_manager', description: 'Manage coupons, banners, campaigns, newsletters', is_system: true, created_at: now, updated_at: now },
      { name: 'Delivery Manager', slug: 'delivery_manager', description: 'Verify partners, manage zones, assign deliveries and couriers', is_system: true, created_at: now, updated_at: now },
      { name: 'Customer Support Agent', slug: 'customer_support_agent', description: 'Handle support tickets, returns, and customer inquiries', is_system: true, created_at: now, updated_at: now },
    ];
    await queryInterface.bulkInsert('roles', rolesData);
    const [roles] = await queryInterface.sequelize.query('SELECT id, slug FROM roles');
    const roleMap = Object.fromEntries(roles.map((r) => [r.slug, r.id]));

    // 2. Permissions
    const permissionsData = [
      { name: 'View Dashboard', slug: 'admin.dashboard.view', module: 'dashboard', description: 'Access admin analytics' },
      { name: 'Manage Catalogue', slug: 'catalogue.manage', module: 'catalogue', description: 'Create/edit products, categories, collections' },
      { name: 'Manage Inventory', slug: 'inventory.manage', module: 'inventory', description: 'Adjust warehouse stock and view alerts' },
      { name: 'Manage Orders', slug: 'orders.manage', module: 'orders', description: 'Update order status and cancellations' },
      { name: 'Manage Payments & Refunds', slug: 'payments.manage', module: 'payments', description: 'Verify UPI, process refunds, reconcile' },
      { name: 'Manage Marketing', slug: 'marketing.manage', module: 'marketing', description: 'Manage coupons, banners, campaigns' },
      { name: 'Manage Delivery & Couriers', slug: 'delivery.manage', module: 'delivery', description: 'Approve partners, assign orders, manage couriers' },
      { name: 'Manage Support & Returns', slug: 'support.manage', module: 'support', description: 'Handle tickets and return requests' },
      { name: 'Manage Customers', slug: 'customers.manage', module: 'customers', description: 'View customer profiles and history' },
      { name: 'View Reports', slug: 'reports.view', module: 'reports', description: 'Export and inspect analytics reports' },
      { name: 'Manage Settings & Staff', slug: 'settings.manage', module: 'settings', description: 'Update staff, roles, tax, and store settings' },
    ].map((p) => ({ ...p, created_at: now, updated_at: now }));

    await queryInterface.bulkInsert('permissions', permissionsData);
    const [permissions] = await queryInterface.sequelize.query('SELECT id, slug FROM permissions');
    const permMap = Object.fromEntries(permissions.map((p) => [p.slug, p.id]));

    const rolePermMapping = {
      super_admin: permissions.map((p) => p.slug),
      catalogue_manager: ['admin.dashboard.view', 'catalogue.manage', 'reports.view'],
      order_manager: ['admin.dashboard.view', 'orders.manage', 'customers.manage', 'reports.view'],
      inventory_manager: ['admin.dashboard.view', 'inventory.manage', 'catalogue.manage', 'reports.view'],
      finance_manager: ['admin.dashboard.view', 'payments.manage', 'reports.view'],
      marketing_manager: ['admin.dashboard.view', 'marketing.manage', 'reports.view'],
      delivery_manager: ['admin.dashboard.view', 'delivery.manage', 'orders.manage', 'reports.view'],
      customer_support_agent: ['admin.dashboard.view', 'support.manage', 'orders.manage', 'customers.manage'],
    };

    const rolePermRows = [];
    for (const [roleSlug, permSlugs] of Object.entries(rolePermMapping)) {
      for (const pSlug of permSlugs) {
        rolePermRows.push({
          role_id: roleMap[roleSlug],
          permission_id: permMap[pSlug],
          created_at: now,
          updated_at: now,
        });
      }
    }
    await queryInterface.bulkInsert('role_permissions', rolePermRows);

    // 3. Users
    const usersData = [
      { full_name: 'Nandini Rao', email: 'admin@taantira.com', phone: '9820010001', password_hash: passwordHashAdmin, status: 'active', is_email_verified: true, created_at: now, updated_at: now },
      { full_name: 'Kavya Nair', email: 'catalogue@taantira.com', phone: '9820010002', password_hash: passwordHashAdmin, status: 'active', is_email_verified: true, created_at: now, updated_at: now },
      { full_name: 'Rhea Kapoor', email: 'orders@taantira.com', phone: '9820010003', password_hash: passwordHashAdmin, status: 'active', is_email_verified: true, created_at: now, updated_at: now },
      { full_name: 'Ishaan Verma', email: 'finance@taantira.com', phone: '9820010004', password_hash: passwordHashAdmin, status: 'active', is_email_verified: true, created_at: now, updated_at: now },
      { full_name: 'Ananya Deshmukh', email: 'ananya@taantira.com', phone: '9820020001', password_hash: passwordHashCustomer, status: 'active', is_email_verified: true, created_at: now, updated_at: now },
      { full_name: 'Meera Iyer', email: 'meera@taantira.com', phone: '9820020002', password_hash: passwordHashCustomer, status: 'active', is_email_verified: true, created_at: now, updated_at: now },
      { full_name: 'Arjun Kulkarni', email: 'rider@taantira.com', phone: '9820030001', password_hash: passwordHashRider, status: 'active', is_email_verified: true, created_at: now, updated_at: now },
      { full_name: 'Suresh Menon', email: 'pending.rider@taantira.com', phone: '9820030002', password_hash: passwordHashRider, status: 'active', is_email_verified: true, created_at: now, updated_at: now },
    ];
    await queryInterface.bulkInsert('users', usersData);
    const [users] = await queryInterface.sequelize.query('SELECT id, email FROM users');
    const userMap = Object.fromEntries(users.map((u) => [u.email, u.id]));

    await queryInterface.bulkInsert('user_roles', [
      { user_id: userMap['admin@taantira.com'], role_id: roleMap.super_admin, created_at: now, updated_at: now },
      { user_id: userMap['catalogue@taantira.com'], role_id: roleMap.catalogue_manager, created_at: now, updated_at: now },
      { user_id: userMap['orders@taantira.com'], role_id: roleMap.order_manager, created_at: now, updated_at: now },
      { user_id: userMap['finance@taantira.com'], role_id: roleMap.finance_manager, created_at: now, updated_at: now },
      { user_id: userMap['ananya@taantira.com'], role_id: roleMap.customer, created_at: now, updated_at: now },
      { user_id: userMap['meera@taantira.com'], role_id: roleMap.customer, created_at: now, updated_at: now },
      { user_id: userMap['rider@taantira.com'], role_id: roleMap.delivery_partner, created_at: now, updated_at: now },
      { user_id: userMap['pending.rider@taantira.com'], role_id: roleMap.delivery_partner, created_at: now, updated_at: now },
    ]);

    // 4. Customer Profiles, Addresses & Wishlists
    await queryInterface.bulkInsert('customer_profiles', [
      { user_id: userMap['ananya@taantira.com'], preferred_size: 'M', loyalty_points: 480, total_spent: 18490.0, total_orders: 2, marketing_opt_in: true, created_at: now, updated_at: now },
      { user_id: userMap['meera@taantira.com'], preferred_size: 'S', loyalty_points: 220, total_spent: 8990.0, total_orders: 1, marketing_opt_in: true, created_at: now, updated_at: now },
    ]);

    await queryInterface.bulkInsert('customer_addresses', [
      {
        user_id: userMap['ananya@taantira.com'],
        label: 'Home',
        recipient_name: 'Ananya Deshmukh',
        phone: '9820020001',
        address_line1: '402 Gulmohar Residency, Pali Hill',
        address_line2: 'Bandra West',
        landmark: 'Near Zig Zag Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400050',
        country: 'India',
        latitude: 19.0607,
        longitude: 72.8275,
        is_default: true,
        created_at: now,
        updated_at: now,
      },
      {
        user_id: userMap['meera@taantira.com'],
        label: 'Studio',
        recipient_name: 'Meera Iyer',
        phone: '9820020002',
        address_line1: '18 Indiranagar 100 Feet Road',
        address_line2: 'HAL 2nd Stage',
        landmark: 'Opposite Heritage Lane',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
        country: 'India',
        latitude: 12.9716,
        longitude: 77.5946,
        is_default: true,
        created_at: now,
        updated_at: now,
      },
    ]);

    await queryInterface.bulkInsert('wishlists', [
      { user_id: userMap['ananya@taantira.com'], name: 'Festive Favorites', created_at: now, updated_at: now },
      { user_id: userMap['meera@taantira.com'], name: 'My Taantira Wishlist', created_at: now, updated_at: now },
    ]);

    // 5. Categories
    const categoriesData = [
      { name: 'Sarees', slug: 'sarees', description: 'Handwoven Banarasi, organza, and heritage silk sarees.', image_url: '/assets/products/saree-burgundy.jpg', sort_order: 1, is_active: true, supports_blouse_option: true, supports_petticoat_option: true, supports_customisation: true, supports_gift_options: true, created_at: now, updated_at: now },
      { name: 'Dresses', slug: 'dresses', description: 'Contemporary silk-georgette and draped evening dresses.', image_url: '/assets/products/dress-berry.jpg', sort_order: 2, is_active: true, supports_blouse_option: false, supports_petticoat_option: false, supports_customisation: true, supports_gift_options: true, created_at: now, updated_at: now },
      { name: 'Kurtas', slug: 'kurtas', description: 'Artisanal Chanderi, mulberry silk, and hand-embroidered kurtas.', image_url: '/assets/products/kurta-sage.jpg', sort_order: 3, is_active: true, supports_blouse_option: false, supports_petticoat_option: false, supports_customisation: true, supports_gift_options: true, created_at: now, updated_at: now },
      { name: 'Suits', slug: 'suits', description: 'Regal anarkali, palazzo, and velvet-trimmed festive suits.', image_url: '/assets/products/suit-maroon.jpg', sort_order: 4, is_active: true, supports_blouse_option: false, supports_petticoat_option: false, supports_customisation: true, supports_gift_options: true, created_at: now, updated_at: now },
      { name: 'Lehengas', slug: 'lehengas', description: 'Heirloom bridal and celebratory lehenga ensembles.', image_url: '/assets/products/lehenga-dusty-rose.jpg', sort_order: 5, is_active: true, supports_blouse_option: true, supports_petticoat_option: true, supports_customisation: true, supports_gift_options: true, created_at: now, updated_at: now },
      { name: 'Accessories', slug: 'accessories', description: 'Hand-embroidered silk potlis, clutches, and heirloom brass accents.', image_url: '/assets/products/accessory-potli.jpg', sort_order: 6, is_active: true, supports_blouse_option: false, supports_petticoat_option: false, supports_customisation: false, supports_gift_options: true, created_at: now, updated_at: now },
    ];
    await queryInterface.bulkInsert('categories', categoriesData);
    const [categories] = await queryInterface.sequelize.query('SELECT id, slug FROM categories');
    const catMap = Object.fromEntries(categories.map((c) => [c.slug, c.id]));

    // 6. Collections
    const collectionsData = [
      { name: 'Festive Collections', slug: 'festive-collections', subtitle: 'Heirloom silks & luminous evening wear', description: 'Curated festive silhouettes crafted in Banaras, Chanderi, and Jaipur.', banner_image_url: '/assets/banners/hero-festive.jpg', is_active: true, sort_order: 1, created_at: now, updated_at: now },
      { name: 'New Arrivals', slug: 'new-arrivals', subtitle: 'Fresh from the Taantira Atelier', description: 'Latest seasonal releases in deep burgundy, warm ivory, and berry rose.', banner_image_url: '/assets/banners/hero-festive.jpg', is_active: true, sort_order: 2, created_at: now, updated_at: now },
      { name: 'Best Sellers', slug: 'best-sellers', subtitle: 'Signature silhouettes loved across India', description: 'Our most-cherished weaves and tailored sets.', banner_image_url: '/assets/banners/hero-festive.jpg', is_active: true, sort_order: 3, created_at: now, updated_at: now },
      { name: 'Bridal & Celebrations', slug: 'bridal-celebrations', subtitle: 'Handcrafted wedding trousseau', description: 'Rich zari lehengas, Banarasi sarees, and statement potlis.', banner_image_url: '/assets/banners/hero-festive.jpg', is_active: true, sort_order: 4, created_at: now, updated_at: now },
    ];
    await queryInterface.bulkInsert('collections', collectionsData);
    const [collections] = await queryInterface.sequelize.query('SELECT id, slug FROM collections');
    const colMap = Object.fromEntries(collections.map((c) => [c.slug, c.id]));

    // 7. Products
    const productsData = [
      {
        name: 'Aaradhya Deep Burgundy Banarasi Silk Saree',
        slug: 'aaradhya-burgundy-banarasi-silk-saree',
        sku: 'TAN-SAR-001',
        primary_category_id: catMap.sarees,
        short_description: 'Handwoven katan Banarasi silk saree with champagne gold geometric zari border.',
        description: 'Woven on traditional pit looms in Varanasi, the Aaradhya Deep Burgundy Banarasi Silk Saree pairs a luminous katan silk drape with finely balanced champagne gold zari borders and an unstitched matching silk blouse piece.',
        story: 'Created over 180 artisan loom hours using ethically sourced mulberry silk yarn dyed in Taantira signature deep burgundy.',
        base_price: 16500.0,
        sale_price: 14200.0,
        tax_rate: 5.0,
        fabric: 'Pure Katan Banarasi Silk',
        occasion: 'Wedding & Festive',
        length_width: '5.5m Saree + 0.9m Blouse Piece | Width: 45 inches',
        wash_care: 'Dry clean only. Store wrapped in unbleached muslin away from moisture.',
        manufacturing_info: 'Handwoven in Varanasi, Uttar Pradesh; finished at Taantira Atelier, Mumbai.',
        country_of_origin: 'India',
        return_policy: '7-day easy return on uncustomized sarees with original tags intact.',
        is_featured: true,
        is_new_arrival: true,
        is_best_seller: true,
        is_trending: true,
        is_active: true,
        rating_avg: 4.9,
        review_count: 2,
        created_at: now,
        updated_at: now,
      },
      {
        name: 'Noor Warm Ivory Organza Silk Saree',
        slug: 'noor-warm-ivory-organza-silk-saree',
        sku: 'TAN-SAR-002',
        primary_category_id: catMap.sarees,
        short_description: 'Featherlight warm ivory silk organza saree accented with dusty rose woven florals.',
        description: 'Effortless grace in sheer silk organza. The Noor Warm Ivory Saree features delicate dusty rose floral motifs and a refined scallop zari edge for daytime ceremonies.',
        story: 'Inspired by heritage summer garden soirées and minimalist heirloom weaves.',
        base_price: 12800.0,
        sale_price: 10990.0,
        tax_rate: 5.0,
        fabric: 'Pure Silk Organza',
        occasion: 'Daytime Festive & Reception',
        length_width: '5.5m Saree + 0.9m Blouse Piece | Width: 44 inches',
        wash_care: 'Dry clean only. Steam gently on low heat.',
        manufacturing_info: 'Handcrafted by master weavers in Chanderi, Madhya Pradesh.',
        country_of_origin: 'India',
        return_policy: '7-day easy return & exchange.',
        is_featured: true,
        is_new_arrival: true,
        is_best_seller: false,
        is_trending: true,
        is_active: true,
        rating_avg: 4.8,
        review_count: 1,
        created_at: now,
        updated_at: now,
      },
      {
        name: 'Meher Berry Rose Pleated Silk-Georgette Dress',
        slug: 'meher-berry-rose-pleated-silk-georgette-dress',
        sku: 'TAN-DRS-001',
        primary_category_id: catMap.dresses,
        short_description: 'Fluid berry rose midi wrap dress crafted in finely pleated silk-georgette.',
        description: 'Designed for modern evening elegance, the Meher dress drapes effortlessly with micro-pleated movement, a sculpted waist sash, and breathable pure mulberry lining.',
        story: 'Tailored in small batches to celebrate fluid tailoring and rich berry tones.',
        base_price: 7800.0,
        sale_price: 6990.0,
        tax_rate: 12.0,
        fabric: 'Silk-Georgette with Mulberry Lining',
        occasion: 'Cocktail & Evening',
        length_width: 'Midi Length: 48 inches | Flared Hem',
        wash_care: 'Dry clean recommended.',
        manufacturing_info: 'Tailored at Taantira Atelier, Mumbai.',
        country_of_origin: 'India',
        return_policy: '7-day easy return & size exchange.',
        is_featured: true,
        is_new_arrival: true,
        is_best_seller: true,
        is_trending: true,
        is_active: true,
        rating_avg: 4.7,
        review_count: 1,
        created_at: now,
        updated_at: now,
      },
      {
        name: 'Ira Soft Sage Chanderi Kurta Set',
        slug: 'ira-soft-sage-chanderi-kurta-set',
        sku: 'TAN-KUR-001',
        primary_category_id: catMap.kurtas,
        short_description: 'Three-piece soft sage Chanderi cotton-silk kurta with ivory trousers and organza dupatta.',
        description: 'Understated daytime luxury. The Ira Kurta Set pairs breathable handloom Chanderi cotton-silk with fine tonal resham embroidery and a featherlight organza dupatta.',
        story: 'Hand-finished by Chanderi artisans using soft botanical sage dyes.',
        base_price: 6400.0,
        sale_price: 5650.0,
        tax_rate: 12.0,
        fabric: 'Chanderi Cotton-Silk',
        occasion: 'Brunch & Pooja',
        length_width: 'Kurta Length: 44 inches | Dupatta: 2.3m x 36 inches',
        wash_care: 'Dry clean or gentle cold hand wash separately.',
        manufacturing_info: 'Handcrafted in Chanderi & Jaipur.',
        country_of_origin: 'India',
        return_policy: '7-day easy return & size exchange.',
        is_featured: true,
        is_new_arrival: false,
        is_best_seller: true,
        is_trending: true,
        is_active: true,
        rating_avg: 4.9,
        review_count: 1,
        created_at: now,
        updated_at: now,
      },
      {
        name: 'Zoya Dark Maroon Velvet-Trimmed Anarkali Suit',
        slug: 'zoya-dark-maroon-velvet-anarkali-suit',
        sku: 'TAN-SUT-001',
        primary_category_id: catMap.suits,
        short_description: 'Floor-grazing dark maroon silk anarkali palazzo suit with antique gold zardozi cuffs.',
        description: 'A regal silhouette crafted in rich dark maroon silk-crepe with silk-velvet yoke accents, flowing kalidar flare, matching wide palazzos, and bordered chiffon dupatta.',
        story: 'Draws on royal winter court attire refined with contemporary tailoring.',
        base_price: 13500.0,
        sale_price: 11800.0,
        tax_rate: 12.0,
        fabric: 'Silk-Crepe & Silk-Velvet',
        occasion: 'Sangeet & Evening Festive',
        length_width: 'Anarkali Length: 52 inches | Dupatta: 2.4m',
        wash_care: 'Dry clean only.',
        manufacturing_info: 'Hand-embroidered in Lucknow & Mumbai.',
        country_of_origin: 'India',
        return_policy: '7-day easy return & size exchange.',
        is_featured: true,
        is_new_arrival: true,
        is_best_seller: true,
        is_trending: false,
        is_active: true,
        rating_avg: 4.8,
        review_count: 1,
        created_at: now,
        updated_at: now,
      },
      {
        name: 'Tara Dusty Rose Raw Silk Bridal Lehenga',
        slug: 'tara-dusty-rose-raw-silk-lehenga',
        sku: 'TAN-LEH-001',
        primary_category_id: catMap.lehengas,
        short_description: 'Heirloom dusty rose and champagne gold embroidered raw silk lehenga ensemble.',
        description: 'An unforgettable celebratory lehenga crafted in pure mulberry raw silk with hand-worked champagne gold kasab embroidery, sculpted blouse, and sheer organza dupatta.',
        story: 'Over 240 hours of artisan hand-embroidery go into every Tara lehenga skirt.',
        base_price: 34000.0,
        sale_price: 29900.0,
        tax_rate: 12.0,
        fabric: 'Pure Mulberry Raw Silk',
        occasion: 'Bridal & Mehendi',
        length_width: 'Skirt Length: 42 inches | Dupatta: 2.5m',
        wash_care: 'Specialist dry clean only.',
        manufacturing_info: 'Crafted in Jaipur & Taantira Bridal Atelier.',
        country_of_origin: 'India',
        return_policy: '7-day return on standard sizes; custom tailored orders are exchange-only for alterations.',
        is_featured: true,
        is_new_arrival: true,
        is_best_seller: false,
        is_trending: true,
        is_active: true,
        rating_avg: 5.0,
        review_count: 1,
        created_at: now,
        updated_at: now,
      },
      {
        name: 'Ruhani Burgundy Silk Pearl Potli & Earring Set',
        slug: 'ruhani-burgundy-silk-potli-set',
        sku: 'TAN-ACC-001',
        primary_category_id: catMap.accessories,
        short_description: 'Hand-embroidered deep burgundy silk potli clutch with freshwater pearl handle and brass drops.',
        description: 'Elevate any festive ensemble with the Ruhani Potli Set featuring antique zari floral vine work, braided pearl wristlet handle, satin lining, and matching champagne gold brass earrings.',
        story: 'Crafted from upcycled Banarasi silk remnants to honor zero-waste atelier practices.',
        base_price: 3800.0,
        sale_price: 3250.0,
        tax_rate: 12.0,
        fabric: 'Pure Silk & Antique Brass',
        occasion: 'Wedding & Festive Gifting',
        length_width: 'Potli: 9 x 8 inches | Earrings: 2.2 inches drop',
        wash_care: 'Spot clean gently; keep away from perfume.',
        manufacturing_info: 'Handcrafted in Jaipur, Rajasthan.',
        country_of_origin: 'India',
        return_policy: '7-day easy return in original gift box.',
        is_featured: true,
        is_new_arrival: false,
        is_best_seller: true,
        is_trending: true,
        is_active: true,
        rating_avg: 4.9,
        review_count: 1,
        created_at: now,
        updated_at: now,
      },
      {
        name: 'Kavya Berry Rose Satin Silk Drape Saree',
        slug: 'kavya-berry-rose-satin-silk-saree',
        sku: 'TAN-SAR-003',
        primary_category_id: catMap.sarees,
        short_description: 'Lustrous berry rose satin-silk saree with champagne gold border.',
        description: 'Contemporary reception drape in fluid satin-finish pure silk with minimal antique gold piping and matching blouse fabric.',
        story: 'Tailored for effortless evening movement and warm studio lustre.',
        base_price: 11200.0,
        sale_price: 9490.0,
        tax_rate: 5.0,
        fabric: 'Pure Satin Crepe Silk',
        occasion: 'Cocktail & Reception',
        length_width: '5.5m Saree + 0.9m Blouse Piece',
        wash_care: 'Dry clean only.',
        manufacturing_info: 'Woven in Mysuru; finished in Mumbai.',
        country_of_origin: 'India',
        return_policy: '7-day easy return & exchange.',
        is_featured: false,
        is_new_arrival: true,
        is_best_seller: true,
        is_trending: false,
        is_active: true,
        rating_avg: 4.8,
        review_count: 0,
        created_at: now,
        updated_at: now,
      },
    ];

    await queryInterface.bulkInsert('products', productsData);
    const [products] = await queryInterface.sequelize.query('SELECT id, slug, primary_category_id FROM products');
    const prodMap = Object.fromEntries(products.map((p) => [p.slug, p.id]));

    // Set matching_product_ids_json links cleanly
    await queryInterface.sequelize.query(
      `UPDATE products SET matching_product_ids_json = '${JSON.stringify([
        prodMap['ruhani-burgundy-silk-potli-set'],
        prodMap['noor-warm-ivory-organza-silk-saree'],
      ])}' WHERE id = ${prodMap['aaradhya-burgundy-banarasi-silk-saree']}`
    );

    await queryInterface.bulkInsert(
      'product_categories',
      products.map((p) => ({ product_id: p.id, category_id: p.primary_category_id, created_at: now, updated_at: now }))
    );

    const collectionLinks = [
      { collection_id: colMap['festive-collections'], product_id: prodMap['aaradhya-burgundy-banarasi-silk-saree'], sort_order: 1 },
      { collection_id: colMap['festive-collections'], product_id: prodMap['zoya-dark-maroon-velvet-anarkali-suit'], sort_order: 2 },
      { collection_id: colMap['festive-collections'], product_id: prodMap['tara-dusty-rose-raw-silk-lehenga'], sort_order: 3 },
      { collection_id: colMap['festive-collections'], product_id: prodMap['ruhani-burgundy-silk-potli-set'], sort_order: 4 },
      { collection_id: colMap['new-arrivals'], product_id: prodMap['noor-warm-ivory-organza-silk-saree'], sort_order: 1 },
      { collection_id: colMap['new-arrivals'], product_id: prodMap['meher-berry-rose-pleated-silk-georgette-dress'], sort_order: 2 },
      { collection_id: colMap['new-arrivals'], product_id: prodMap['kavya-berry-rose-satin-silk-saree'], sort_order: 3 },
      { collection_id: colMap['best-sellers'], product_id: prodMap['aaradhya-burgundy-banarasi-silk-saree'], sort_order: 1 },
      { collection_id: colMap['best-sellers'], product_id: prodMap['ira-soft-sage-chanderi-kurta-set'], sort_order: 2 },
      { collection_id: colMap['best-sellers'], product_id: prodMap['meher-berry-rose-pleated-silk-georgette-dress'], sort_order: 3 },
      { collection_id: colMap['bridal-celebrations'], product_id: prodMap['tara-dusty-rose-raw-silk-lehenga'], sort_order: 1 },
      { collection_id: colMap['bridal-celebrations'], product_id: prodMap['aaradhya-burgundy-banarasi-silk-saree'], sort_order: 2 },
    ].map((row) => ({ ...row, created_at: now, updated_at: now }));
    await queryInterface.bulkInsert('collection_products', collectionLinks);

    // 8. Product Images
    const imagesData = [
      { product_id: prodMap['aaradhya-burgundy-banarasi-silk-saree'], image_url: '/assets/products/saree-burgundy.jpg', alt_text: 'Aaradhya Deep Burgundy Banarasi Silk Saree', is_primary: true, sort_order: 1 },
      { product_id: prodMap['aaradhya-burgundy-banarasi-silk-saree'], image_url: '/assets/products/accessory-potli.jpg', alt_text: 'Suggested Burgundy Silk Potli Pairing', is_primary: false, sort_order: 2 },
      { product_id: prodMap['noor-warm-ivory-organza-silk-saree'], image_url: '/assets/products/saree-ivory.jpg', alt_text: 'Noor Warm Ivory Organza Silk Saree', is_primary: true, sort_order: 1 },
      { product_id: prodMap['meher-berry-rose-pleated-silk-georgette-dress'], image_url: '/assets/products/dress-berry.jpg', alt_text: 'Meher Berry Rose Pleated Silk-Georgette Dress', is_primary: true, sort_order: 1 },
      { product_id: prodMap['ira-soft-sage-chanderi-kurta-set'], image_url: '/assets/products/kurta-sage.jpg', alt_text: 'Ira Soft Sage Chanderi Kurta Set', is_primary: true, sort_order: 1 },
      { product_id: prodMap['zoya-dark-maroon-velvet-anarkali-suit'], image_url: '/assets/products/suit-maroon.jpg', alt_text: 'Zoya Dark Maroon Velvet-Trimmed Anarkali Suit', is_primary: true, sort_order: 1 },
      { product_id: prodMap['tara-dusty-rose-raw-silk-lehenga'], image_url: '/assets/products/lehenga-dusty-rose.jpg', alt_text: 'Tara Dusty Rose Raw Silk Bridal Lehenga', is_primary: true, sort_order: 1 },
      { product_id: prodMap['ruhani-burgundy-silk-potli-set'], image_url: '/assets/products/accessory-potli.jpg', alt_text: 'Ruhani Burgundy Silk Pearl Potli & Earring Set', is_primary: true, sort_order: 1 },
      { product_id: prodMap['kavya-berry-rose-satin-silk-saree'], image_url: '/assets/products/saree-burgundy.jpg', alt_text: 'Kavya Berry Rose Satin Silk Drape Saree', is_primary: true, sort_order: 1 },
    ].map((img) => ({ ...img, created_at: now, updated_at: now }));
    await queryInterface.bulkInsert('product_images', imagesData);

    // 9. Product Variants & Warehouse Stock
    const variantsSeed = [
      { product_id: prodMap['aaradhya-burgundy-banarasi-silk-saree'], sku: 'TAN-SAR-001-FS', size: 'Free Size', color_name: 'Deep Burgundy', color_hex: '#641B32', stock_qty: 18, low_stock_threshold: 4 },
      { product_id: prodMap['noor-warm-ivory-organza-silk-saree'], sku: 'TAN-SAR-002-FS', size: 'Free Size', color_name: 'Warm Ivory', color_hex: '#FFF9F2', stock_qty: 14, low_stock_threshold: 4 },
      { product_id: prodMap['meher-berry-rose-pleated-silk-georgette-dress'], sku: 'TAN-DRS-001-S', size: 'S', color_name: 'Berry Rose', color_hex: '#A83F5E', stock_qty: 12, low_stock_threshold: 4 },
      { product_id: prodMap['meher-berry-rose-pleated-silk-georgette-dress'], sku: 'TAN-DRS-001-M', size: 'M', color_name: 'Berry Rose', color_hex: '#A83F5E', stock_qty: 16, low_stock_threshold: 4 },
      { product_id: prodMap['meher-berry-rose-pleated-silk-georgette-dress'], sku: 'TAN-DRS-001-L', size: 'L', color_name: 'Berry Rose', color_hex: '#A83F5E', stock_qty: 3, low_stock_threshold: 5 },
      { product_id: prodMap['ira-soft-sage-chanderi-kurta-set'], sku: 'TAN-KUR-001-S', size: 'S', color_name: 'Soft Sage', color_hex: '#A8AD91', stock_qty: 11, low_stock_threshold: 4 },
      { product_id: prodMap['ira-soft-sage-chanderi-kurta-set'], sku: 'TAN-KUR-001-M', size: 'M', color_name: 'Soft Sage', color_hex: '#A8AD91', stock_qty: 20, low_stock_threshold: 4 },
      { product_id: prodMap['ira-soft-sage-chanderi-kurta-set'], sku: 'TAN-KUR-001-L', size: 'L', color_name: 'Soft Sage', color_hex: '#A8AD91', stock_qty: 9, low_stock_threshold: 4 },
      { product_id: prodMap['zoya-dark-maroon-velvet-anarkali-suit'], sku: 'TAN-SUT-001-M', size: 'M', color_name: 'Dark Maroon', color_hex: '#3D1023', stock_qty: 10, low_stock_threshold: 3 },
      { product_id: prodMap['zoya-dark-maroon-velvet-anarkali-suit'], sku: 'TAN-SUT-001-L', size: 'L', color_name: 'Dark Maroon', color_hex: '#3D1023', stock_qty: 4, low_stock_threshold: 5 },
      { product_id: prodMap['tara-dusty-rose-raw-silk-lehenga'], sku: 'TAN-LEH-001-S', size: 'S', color_name: 'Dusty Rose', color_hex: '#D9A0A9', stock_qty: 6, low_stock_threshold: 2 },
      { product_id: prodMap['tara-dusty-rose-raw-silk-lehenga'], sku: 'TAN-LEH-001-M', size: 'M', color_name: 'Dusty Rose', color_hex: '#D9A0A9', stock_qty: 8, low_stock_threshold: 2 },
      { product_id: prodMap['ruhani-burgundy-silk-potli-set'], sku: 'TAN-ACC-001-OS', size: 'One Size', color_name: 'Champagne Gold', color_hex: '#C39A52', stock_qty: 25, low_stock_threshold: 5 },
      { product_id: prodMap['kavya-berry-rose-satin-silk-saree'], sku: 'TAN-SAR-003-FS', size: 'Free Size', color_name: 'Berry Rose', color_hex: '#A83F5E', stock_qty: 12, low_stock_threshold: 4 },
    ].map((v) => ({ ...v, reserved_qty: 0, is_active: true, created_at: now, updated_at: now }));
    await queryInterface.bulkInsert('product_variants', variantsSeed);

    await queryInterface.bulkInsert('warehouses', [
      {
        name: 'Mumbai Flagship Atelier Warehouse',
        code: 'WH-MUM-01',
        address: '14 Kala Ghoda Heritage Lane, Fort',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        is_active: true,
        is_default: true,
        created_at: now,
        updated_at: now,
      },
    ]);
    const [warehouses] = await queryInterface.sequelize.query('SELECT id FROM warehouses LIMIT 1');
    const [variants] = await queryInterface.sequelize.query('SELECT id, sku, stock_qty, low_stock_threshold FROM product_variants');
    const varMap = Object.fromEntries(variants.map((v) => [v.sku, v.id]));
    const warehouseId = warehouses[0].id;

    await queryInterface.bulkInsert(
      'warehouse_stock',
      variants.map((v) => ({
        warehouse_id: warehouseId,
        variant_id: v.id,
        quantity_on_hand: v.stock_qty,
        quantity_reserved: 0,
        reorder_level: v.low_stock_threshold,
        created_at: now,
        updated_at: now,
      }))
    );

    // 10. Reviews & Q&A
    await queryInterface.bulkInsert('product_reviews', [
      { product_id: prodMap['aaradhya-burgundy-banarasi-silk-saree'], user_id: userMap['ananya@taantira.com'], rating: 5, title: 'Exquisite Banarasi craftsmanship', comment: 'The deep burgundy silk glows under evening light without feeling heavy. Custom blouse stitching fit like a dream.', is_verified_purchase: true, is_approved: true, created_at: now, updated_at: now },
      { product_id: prodMap['meher-berry-rose-pleated-silk-georgette-dress'], user_id: userMap['meera@taantira.com'], rating: 5, title: 'Effortless evening drape', comment: 'Soft lining, zero sheerness, and the berry shade looks even richer in person.', is_verified_purchase: true, is_approved: true, created_at: now, updated_at: now },
      { product_id: prodMap['ira-soft-sage-chanderi-kurta-set'], user_id: userMap['ananya@taantira.com'], rating: 5, title: 'Breathable heirloom weave', comment: 'Wore it for an all-day family function and stayed comfortable throughout.', is_verified_purchase: true, is_approved: true, created_at: now, updated_at: now },
    ]);

    await queryInterface.bulkInsert('product_questions', [
      {
        product_id: prodMap['aaradhya-burgundy-banarasi-silk-saree'],
        user_id: userMap['meera@taantira.com'],
        question: 'Does the saree include an unstitched blouse piece and fall-pico option?',
        answer: 'Yes, it includes a 0.9m pure katan silk blouse piece, and you can select fall-pico or stitched blouse tailoring on the product page.',
        answered_by: userMap['admin@taantira.com'],
        answered_at: now,
        is_published: true,
        created_at: now,
        updated_at: now,
      },
    ]);

    // 11. Coupons
    const nextYear = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    await queryInterface.bulkInsert('coupons', [
      { code: 'TAANTIRA10', description: '10% off welcome privilege on orders above Rs 2,500', discount_type: 'percentage', discount_value: 10.0, min_purchase_amount: 2500.0, max_discount_amount: 2500.0, starts_at: now, expires_at: nextYear, usage_limit: 500, per_customer_limit: 2, used_count: 1, is_active: true, created_at: now, updated_at: now },
      { code: 'FESTIVE500', description: 'Flat Rs 500 off festive edit above Rs 4,999', discount_type: 'fixed', discount_value: 500.0, min_purchase_amount: 4999.0, max_discount_amount: 500.0, starts_at: now, expires_at: nextYear, usage_limit: 300, per_customer_limit: 1, used_count: 0, is_active: true, created_at: now, updated_at: now },
    ]);

    // 12. Delivery Zones, Pincodes, Partners
    await queryInterface.bulkInsert('delivery_zones', [
      { name: 'Mumbai Metro Same-Day', city: 'Mumbai', state: 'Maharashtra', base_fee: 99.0, per_order_payout: 80.0, estimated_hours: 12, is_active: true, created_at: now, updated_at: now },
      { name: 'Bengaluru Central Express', city: 'Bengaluru', state: 'Karnataka', base_fee: 119.0, per_order_payout: 85.0, estimated_hours: 24, is_active: true, created_at: now, updated_at: now },
      { name: 'Delhi NCR Atelier Zone', city: 'New Delhi', state: 'Delhi', base_fee: 119.0, per_order_payout: 85.0, estimated_hours: 24, is_active: true, created_at: now, updated_at: now },
    ]);
    const [zones] = await queryInterface.sequelize.query('SELECT id, city FROM delivery_zones');
    const zoneMap = Object.fromEntries(zones.map((z) => [z.city, z.id]));

    await queryInterface.bulkInsert('delivery_zone_pincodes', [
      { delivery_zone_id: zoneMap['Mumbai'], pincode: '400001', is_serviceable: true, cod_available: true, created_at: now, updated_at: now },
      { delivery_zone_id: zoneMap['Mumbai'], pincode: '400050', is_serviceable: true, cod_available: true, created_at: now, updated_at: now },
      { delivery_zone_id: zoneMap['Mumbai'], pincode: '400051', is_serviceable: true, cod_available: true, created_at: now, updated_at: now },
      { delivery_zone_id: zoneMap['Bengaluru'], pincode: '560001', is_serviceable: true, cod_available: true, created_at: now, updated_at: now },
      { delivery_zone_id: zoneMap['New Delhi'], pincode: '110001', is_serviceable: true, cod_available: true, created_at: now, updated_at: now },
    ]);

    await queryInterface.bulkInsert('delivery_partners', [
      {
        user_id: userMap['rider@taantira.com'],
        partner_code: 'TAN-DP-001',
        address: '21 Linking Road, Bandra West',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400050',
        service_pincodes_json: JSON.stringify(['400001', '400050', '400051']),
        approval_status: 'approved',
        is_online: true,
        current_availability: 'on_delivery',
        approved_by: userMap['admin@taantira.com'],
        approved_at: now,
        created_at: now,
        updated_at: now,
      },
      {
        user_id: userMap['pending.rider@taantira.com'],
        partner_code: 'TAN-DP-002',
        address: '45 MG Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
        service_pincodes_json: JSON.stringify(['560001']),
        approval_status: 'pending',
        is_online: false,
        current_availability: 'offline',
        created_at: now,
        updated_at: now,
      },
    ]);
    const [partners] = await queryInterface.sequelize.query('SELECT id, partner_code FROM delivery_partners');
    const partnerMap = Object.fromEntries(partners.map((p) => [p.partner_code, p.id]));

    await queryInterface.bulkInsert('delivery_vehicles', [
      { delivery_partner_id: partnerMap['TAN-DP-001'], vehicle_type: 'Electric Scooter', vehicle_number: 'MH02EV4412', model_name: 'Ather 450X', is_active: true, created_at: now, updated_at: now },
      { delivery_partner_id: partnerMap['TAN-DP-002'], vehicle_type: 'Two-Wheeler', vehicle_number: 'KA01AB9921', model_name: 'Activa 6G', is_active: true, created_at: now, updated_at: now },
    ]);

    await queryInterface.bulkInsert('delivery_documents', [
      { delivery_partner_id: partnerMap['TAN-DP-001'], doc_type: 'Driving Licence', doc_number_masked: 'MH02-XXXX-9921', verification_status: 'verified', verified_by: userMap['admin@taantira.com'], verified_at: now, created_at: now, updated_at: now },
      { delivery_partner_id: partnerMap['TAN-DP-002'], doc_type: 'Driving Licence', doc_number_masked: 'KA01-XXXX-1145', verification_status: 'pending', created_at: now, updated_at: now },
    ]);

    // 13. Sample Orders (for Analytics, Customer Dashboard, Partner Tracking, UPI Verification)
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    await queryInterface.bulkInsert('orders', [
      {
        order_number: 'TAN-2026-1001',
        user_id: userMap['ananya@taantira.com'],
        status: 'delivered',
        payment_method: 'manual_upi',
        payment_status: 'paid',
        delivery_mode: 'own_partner',
        subtotal: 14200.0,
        discount_amount: 1420.0,
        tax_amount: 639.0,
        shipping_fee: 0.0,
        total_amount: 13419.0,
        coupon_code: 'TAANTIRA10',
        delivery_otp_code: '482910',
        otp_verified_at: threeDaysAgo,
        placed_at: threeDaysAgo,
        delivered_at: threeDaysAgo,
        created_at: threeDaysAgo,
        updated_at: threeDaysAgo,
      },
      {
        order_number: 'TAN-2026-1002',
        user_id: userMap['ananya@taantira.com'],
        status: 'shipped',
        payment_method: 'cod',
        payment_status: 'pending',
        delivery_mode: 'own_partner',
        subtotal: 5650.0,
        discount_amount: 0.0,
        tax_amount: 678.0,
        shipping_fee: 0.0,
        total_amount: 6328.0,
        delivery_otp_code: '739204',
        placed_at: now,
        created_at: now,
        updated_at: now,
      },
      {
        order_number: 'TAN-2026-1003',
        user_id: userMap['meera@taantira.com'],
        status: 'new',
        payment_method: 'manual_upi',
        payment_status: 'awaiting_verification',
        delivery_mode: 'third_party_courier',
        subtotal: 6990.0,
        discount_amount: 0.0,
        tax_amount: 838.8,
        shipping_fee: 0.0,
        total_amount: 7828.8,
        placed_at: now,
        created_at: now,
        updated_at: now,
      },
    ]);

    const [orders] = await queryInterface.sequelize.query('SELECT id, order_number FROM orders');
    const orderMap = Object.fromEntries(orders.map((o) => [o.order_number, o.id]));

    await queryInterface.bulkInsert('order_items', [
      { order_id: orderMap['TAN-2026-1001'], product_id: prodMap['aaradhya-burgundy-banarasi-silk-saree'], variant_id: varMap['TAN-SAR-001-FS'], product_name: 'Aaradhya Deep Burgundy Banarasi Silk Saree', sku: 'TAN-SAR-001-FS', size: 'Free Size', color_name: 'Deep Burgundy', quantity: 1, unit_price: 14200.0, tax_amount: 639.0, total_price: 14839.0, image_url: '/assets/products/saree-burgundy.jpg', created_at: threeDaysAgo, updated_at: threeDaysAgo },
      { order_id: orderMap['TAN-2026-1002'], product_id: prodMap['ira-soft-sage-chanderi-kurta-set'], variant_id: varMap['TAN-KUR-001-M'], product_name: 'Ira Soft Sage Chanderi Kurta Set', sku: 'TAN-KUR-001-M', size: 'M', color_name: 'Soft Sage', quantity: 1, unit_price: 5650.0, tax_amount: 678.0, total_price: 6328.0, image_url: '/assets/products/kurta-sage.jpg', created_at: now, updated_at: now },
      { order_id: orderMap['TAN-2026-1003'], product_id: prodMap['meher-berry-rose-pleated-silk-georgette-dress'], variant_id: varMap['TAN-DRS-001-S'], product_name: 'Meher Berry Rose Pleated Silk-Georgette Dress', sku: 'TAN-DRS-001-S', size: 'S', color_name: 'Berry Rose', quantity: 1, unit_price: 6990.0, tax_amount: 838.8, total_price: 7828.8, image_url: '/assets/products/dress-berry.jpg', created_at: now, updated_at: now },
    ]);

    await queryInterface.bulkInsert('order_addresses', [
      { order_id: orderMap['TAN-2026-1001'], recipient_name: 'Ananya Deshmukh', phone: '9820020001', email: 'ananya@taantira.com', address_line1: '402 Gulmohar Residency, Pali Hill', address_line2: 'Bandra West', city: 'Mumbai', state: 'Maharashtra', pincode: '400050', country: 'India', latitude: 19.0607, longitude: 72.8275, created_at: threeDaysAgo, updated_at: threeDaysAgo },
      { order_id: orderMap['TAN-2026-1002'], recipient_name: 'Ananya Deshmukh', phone: '9820020001', email: 'ananya@taantira.com', address_line1: '402 Gulmohar Residency, Pali Hill', address_line2: 'Bandra West', city: 'Mumbai', state: 'Maharashtra', pincode: '400050', country: 'India', latitude: 19.0607, longitude: 72.8275, created_at: now, updated_at: now },
      { order_id: orderMap['TAN-2026-1003'], recipient_name: 'Meera Iyer', phone: '9820020002', email: 'meera@taantira.com', address_line1: '18 Indiranagar 100 Feet Road', address_line2: 'HAL 2nd Stage', city: 'Bengaluru', state: 'Karnataka', pincode: '560001', country: 'India', latitude: 12.9716, longitude: 77.5946, created_at: now, updated_at: now },
    ]);

    await queryInterface.bulkInsert('payments', [
      { order_id: orderMap['TAN-2026-1001'], user_id: userMap['ananya@taantira.com'], method: 'manual_upi', status: 'paid', amount: 13419.0, currency: 'INR', upi_vpa: 'taantira.atelier@upi', customer_utr: '431988120455', submitted_at: threeDaysAgo, verified_by: userMap['finance@taantira.com'], verified_at: threeDaysAgo, verification_note: 'Verified in bank statement', created_at: threeDaysAgo, updated_at: threeDaysAgo },
      { order_id: orderMap['TAN-2026-1002'], user_id: userMap['ananya@taantira.com'], method: 'cod', status: 'pending', amount: 6328.0, currency: 'INR', created_at: now, updated_at: now },
      { order_id: orderMap['TAN-2026-1003'], user_id: userMap['meera@taantira.com'], method: 'manual_upi', status: 'awaiting_verification', amount: 7828.8, currency: 'INR', upi_vpa: 'taantira.atelier@upi', customer_utr: '432899001122', submitted_at: now, created_at: now, updated_at: now },
    ]);

    await queryInterface.bulkInsert('delivery_assignments', [
      { order_id: orderMap['TAN-2026-1001'], delivery_partner_id: partnerMap['TAN-DP-001'], status: 'delivered', assigned_by: userMap['admin@taantira.com'], assigned_at: threeDaysAgo, accepted_at: threeDaysAgo, picked_up_at: threeDaysAgo, out_for_delivery_at: threeDaysAgo, delivered_at: threeDaysAgo, created_at: threeDaysAgo, updated_at: threeDaysAgo },
      { order_id: orderMap['TAN-2026-1002'], delivery_partner_id: partnerMap['TAN-DP-001'], status: 'out_for_delivery', assigned_by: userMap['admin@taantira.com'], assigned_at: now, accepted_at: now, picked_up_at: now, out_for_delivery_at: now, created_at: now, updated_at: now },
    ]);
    const [assignments] = await queryInterface.sequelize.query('SELECT id, order_id FROM delivery_assignments');
    const activeAssignment = assignments.find((a) => a.order_id === orderMap['TAN-2026-1002']);

    await queryInterface.bulkInsert('delivery_partner_current_locations', [
      { delivery_partner_id: partnerMap['TAN-DP-001'], delivery_assignment_id: activeAssignment.id, latitude: 19.0544, longitude: 72.8322, accuracy_meters: 14.0, recorded_at: now, created_at: now, updated_at: now },
    ]);

    // 14. Marketing, Settings, Notifications
    await queryInterface.bulkInsert('banners', [
      { title: 'The Festive Heritage Edit', subtitle: 'Handwoven Banarasi Silks, Organza Drapes & Heirloom Lehengas', image_url: '/assets/banners/hero-festive.jpg', cta_text: 'Explore Festive Collection', cta_link: '/collections/festive-collections', position: 'hero', sort_order: 1, is_active: true, created_at: now, updated_at: now },
    ]);

    await queryInterface.bulkInsert('promotional_campaigns', [
      { title: 'Festive Atelier Privilege', message: 'Enjoy complimentary insured shipping above Rs 2,999 + 10% off with code TAANTIRA10', badge_text: 'NEW SEASON', link_url: '/collections/festive-collections', is_active: true, created_at: now, updated_at: now },
    ]);

    await queryInterface.bulkInsert('system_settings', [
      { setting_key: 'store_name', setting_value: 'Taantira', group_name: 'store', is_public: true, description: 'Brand store name' },
      { setting_key: 'upi_vpa', setting_value: 'taantira.atelier@upi', group_name: 'payment', is_public: true, description: 'Business UPI VPA for manual UPI payments' },
      { setting_key: 'upi_payee_name', setting_value: 'Taantira Handloom & Couture Atelier', group_name: 'payment', is_public: true, description: 'Payee display name for UPI' },
      { setting_key: 'free_shipping_threshold', setting_value: '2999', group_name: 'shipping', is_public: true, description: 'Free shipping threshold in INR' },
      { setting_key: 'default_shipping_fee', setting_value: '149', group_name: 'shipping', is_public: true, description: 'Default shipping fee below threshold' },
      { setting_key: 'default_tax_rate', setting_value: '12', group_name: 'tax', is_public: true, description: 'Default GST percentage' },
      { setting_key: 'cod_enabled', setting_value: 'true', group_name: 'payment', is_public: true, description: 'Enable Cash on Delivery' },
    ].map((s) => ({ ...s, created_at: now, updated_at: now })));

    await queryInterface.bulkInsert('notifications', [
      { user_id: userMap['ananya@taantira.com'], title: 'Order Out for Delivery', message: 'Your order TAN-2026-1002 is out for delivery with partner Arjun Kulkarni. Share your Delivery OTP only upon parcel arrival.', category: 'delivery', link_url: `/account/orders/${orderMap['TAN-2026-1002']}`, is_read: false, created_at: now, updated_at: now },
      { user_id: userMap['admin@taantira.com'], title: 'UPI Verification Pending', message: 'Order TAN-2026-1003 has a submitted UTR (432899001122) awaiting finance verification.', category: 'payment', link_url: '/admin/payments', is_read: false, created_at: now, updated_at: now },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('notifications', null, {});
    await queryInterface.bulkDelete('system_settings', null, {});
    await queryInterface.bulkDelete('promotional_campaigns', null, {});
    await queryInterface.bulkDelete('banners', null, {});
    await queryInterface.bulkDelete('delivery_partner_current_locations', null, {});
    await queryInterface.bulkDelete('delivery_assignments', null, {});
    await queryInterface.bulkDelete('payments', null, {});
    await queryInterface.bulkDelete('order_addresses', null, {});
    await queryInterface.bulkDelete('order_items', null, {});
    await queryInterface.bulkDelete('orders', null, {});
    await queryInterface.bulkDelete('delivery_documents', null, {});
    await queryInterface.bulkDelete('delivery_vehicles', null, {});
    await queryInterface.bulkDelete('delivery_partners', null, {});
    await queryInterface.bulkDelete('delivery_zone_pincodes', null, {});
    await queryInterface.bulkDelete('delivery_zones', null, {});
    await queryInterface.bulkDelete('coupons', null, {});
    await queryInterface.bulkDelete('product_questions', null, {});
    await queryInterface.bulkDelete('product_reviews', null, {});
    await queryInterface.bulkDelete('warehouse_stock', null, {});
    await queryInterface.bulkDelete('warehouses', null, {});
    await queryInterface.bulkDelete('product_variants', null, {});
    await queryInterface.bulkDelete('product_images', null, {});
    await queryInterface.bulkDelete('collection_products', null, {});
    await queryInterface.bulkDelete('product_categories', null, {});
    await queryInterface.bulkDelete('products', null, {});
    await queryInterface.bulkDelete('collections', null, {});
    await queryInterface.bulkDelete('categories', null, {});
    await queryInterface.bulkDelete('wishlists', null, {});
    await queryInterface.bulkDelete('customer_addresses', null, {});
    await queryInterface.bulkDelete('customer_profiles', null, {});
    await queryInterface.bulkDelete('user_roles', null, {});
    await queryInterface.bulkDelete('users', null, {});
    await queryInterface.bulkDelete('role_permissions', null, {});
    await queryInterface.bulkDelete('permissions', null, {});
    await queryInterface.bulkDelete('roles', null, {});
  },
};
