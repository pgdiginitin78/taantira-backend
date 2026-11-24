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
      { name: 'Catalogue Manager', slug: 'catalogue_manager', description: 'Manage sarees, jewellery, categories, collections, reviews', is_system: true, created_at: now, updated_at: now },
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
      { name: 'Manage Catalogue', slug: 'catalogue.manage', module: 'catalogue', description: 'Create/edit sarees, jewellery, categories, collections' },
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
      { user_id: userMap['ananya@taantira.com'], preferred_size: 'Free Size', loyalty_points: 480, total_spent: 25190.0, total_orders: 2, marketing_opt_in: true, created_at: now, updated_at: now },
      { user_id: userMap['meera@taantira.com'], preferred_size: 'Free Size', loyalty_points: 220, total_spent: 10990.0, total_orders: 1, marketing_opt_in: true, created_at: now, updated_at: now },
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
      { user_id: userMap['ananya@taantira.com'], name: 'Saree Trousseau', created_at: now, updated_at: now },
      { user_id: userMap['meera@taantira.com'], name: 'My Taantira Wishlist', created_at: now, updated_at: now },
    ]);

    // 5. Categories (7 Main Saree Categories -> 42 Subcategories + 1 Heritage Saree Jewellery Category)
    const { MAIN_CATEGORIES, JEWELLERY_CATEGORY } = require('../src/data/sareeCatalogueData');

    const parentCategoriesData = [
      ...MAIN_CATEGORIES.map((main) => ({
        name: main.name,
        slug: main.slug,
        parent_id: null,
        description: main.description,
        image_url: main.image_url,
        sort_order: main.sort_order,
        is_active: true,
        supports_blouse_option: true,
        supports_petticoat_option: true,
        supports_customisation: true,
        supports_gift_options: true,
        created_at: now,
        updated_at: now,
      })),
      {
        name: JEWELLERY_CATEGORY.name,
        slug: JEWELLERY_CATEGORY.slug,
        parent_id: null,
        description: JEWELLERY_CATEGORY.description,
        image_url: JEWELLERY_CATEGORY.image_url,
        sort_order: JEWELLERY_CATEGORY.sort_order,
        is_active: true,
        supports_blouse_option: false,
        supports_petticoat_option: false,
        supports_customisation: false,
        supports_gift_options: true,
        created_at: now,
        updated_at: now,
      },
    ];
    await queryInterface.bulkInsert('categories', parentCategoriesData);
    const [parentRows] = await queryInterface.sequelize.query('SELECT id, slug FROM categories WHERE parent_id IS NULL');
    const mainCatMap = Object.fromEntries(parentRows.map((c) => [c.slug, c.id]));

    const subcategoryRows = [];
    for (const main of MAIN_CATEGORIES) {
      main.subcategories.forEach((sub, idx) => {
        subcategoryRows.push({
          name: sub.name,
          slug: sub.slug,
          parent_id: mainCatMap[main.slug],
          description: `${sub.name} (${sub.fabric}) under ${main.name}`,
          image_url: null,
          sort_order: idx + 1,
          is_active: true,
          supports_blouse_option: true,
          supports_petticoat_option: true,
          supports_customisation: true,
          supports_gift_options: true,
          created_at: now,
          updated_at: now,
        });
      });
    }
    await queryInterface.bulkInsert('categories', subcategoryRows);
    const [categories] = await queryInterface.sequelize.query('SELECT id, slug FROM categories');
    const catMap = Object.fromEntries(categories.map((c) => [c.slug, c.id]));

    // 6. Collections
    const collectionsData = [
      { name: 'Festive Saree Edit', slug: 'festive-collections', subtitle: 'Heirloom silk weaves for celebratory evenings', description: 'Curated Banarasi, Kanjivaram, Paithani, Nauvari, and Jamdani sarees crafted across India.', banner_image_url: '/assets/banners/hero-festive.jpg', is_active: true, sort_order: 1, created_at: now, updated_at: now },
      { name: 'New Arrivals', slug: 'new-arrivals', subtitle: 'Latest handloom sarees from the atelier', description: 'Fresh weaves across our 7 saree houses.', banner_image_url: '/assets/banners/hero-festive.jpg', is_active: true, sort_order: 2, created_at: now, updated_at: now },
      { name: 'Best Sellers', slug: 'best-sellers', subtitle: 'Most-loved Taantira sarees', description: 'Signature sarees ordered by patrons across India.', banner_image_url: '/assets/banners/hero-festive.jpg', is_active: true, sort_order: 3, created_at: now, updated_at: now },
      { name: 'Nauvari / 9 Vaari Sarees', slug: 'nauvari-sarees', subtitle: 'Authentic nine-yard Maharashtrian drapes', description: 'Traditional Paithani, Brahmani, Peshwai, Koli, Kashta & Ready-to-Wear Nauvari sarees.', banner_image_url: '/assets/banners/hero-festive.jpg', is_active: true, sort_order: 4, created_at: now, updated_at: now },
      { name: 'Saree Jewellery Pairing', slug: 'jewellery-pairing', subtitle: 'Curated heritage saree jewellery', description: 'Antique gold & pearl accents tailored for silk saree drapes.', banner_image_url: '/assets/banners/hero-festive.jpg', is_active: true, sort_order: 5, created_at: now, updated_at: now },
    ];
    await queryInterface.bulkInsert('collections', collectionsData);
    const [collections] = await queryInterface.sequelize.query('SELECT id, slug FROM collections');
    const colMap = Object.fromEntries(collections.map((c) => [c.slug, c.id]));

    // 7. Products: 210 Unique Sarees across 42 Subcategories + 1 Curated Saree Jewellery Item
    const productsData = [];
    const prodMetaBySlug = {};

    for (const main of MAIN_CATEGORIES) {
      for (const sub of main.subcategories) {
        for (const prod of sub.products) {
          prodMetaBySlug[prod.slug] = { main, sub, prod };
          productsData.push({
            name: prod.name,
            slug: prod.slug,
            sku: prod.sku,
            primary_category_id: catMap[sub.slug],
            short_description: `${main.name} · ${sub.name} in ${sub.fabric}.`,
            description: `${prod.name} curated under Taantira's ${main.name} (${sub.name}) collection, woven in ${sub.fabric}.`,
            story: null,
            base_price: Number(prod.price),
            sale_price: prod.sale_price ? Number(prod.sale_price) : null,
            tax_rate: 5.0,
            fabric: sub.fabric,
            occasion: main.slug === 'nauvari-sarees' ? 'Maharashtrian Nine-Yard Ceremonial' : 'Handloom & Festive',
            length_width: prod.length_width || null,
            wash_care: prod.wash_care || null,
            manufacturing_info: null,
            country_of_origin: 'India',
            return_policy: '7-day easy return on uncustomized sarees.',
            is_featured: Boolean(prod.is_featured),
            is_new_arrival: Boolean(prod.is_new_arrival),
            is_best_seller: Boolean(prod.is_best_seller),
            is_trending: Boolean(prod.is_featured || prod.is_best_seller),
            is_active: true,
            rating_avg: prod.image_url ? 4.9 : 0.0,
            review_count: 0,
            created_at: now,
            updated_at: now,
          });
        }
      }
    }

    const jProd = JEWELLERY_CATEGORY.product;
    productsData.push({
      name: jProd.name,
      slug: jProd.slug,
      sku: jProd.sku,
      primary_category_id: catMap[JEWELLERY_CATEGORY.slug],
      short_description: 'Handcrafted antique champagne gold floral brass & freshwater pearl saree earrings.',
      description: `${jProd.name} curated exclusively to complement Taantira silk sarees.`,
      story: null,
      base_price: Number(jProd.price),
      sale_price: Number(jProd.sale_price),
      tax_rate: 3.0,
      fabric: jProd.fabric,
      occasion: 'Saree Pairing & Gifting',
      length_width: 'Drop Length: 2.4 inches',
      wash_care: 'Store in airtight box away from moisture and perfume.',
      manufacturing_info: 'Handcrafted in India.',
      country_of_origin: 'India',
      return_policy: '7-day easy return in tamper-evident jewellery box.',
      is_featured: true,
      is_new_arrival: true,
      is_best_seller: true,
      is_trending: true,
      is_active: true,
      rating_avg: 4.9,
      review_count: 1,
      created_at: now,
      updated_at: now,
    });

    await queryInterface.bulkInsert('products', productsData);
    const [products] = await queryInterface.sequelize.query('SELECT id, slug, sku, primary_category_id FROM products');
    const prodMap = Object.fromEntries(products.map((p) => [p.slug, p.id]));

    await queryInterface.sequelize.query(
      `UPDATE products SET matching_product_ids_json = '${JSON.stringify([
        prodMap['ruhani-champagne-gold-pearl-chandbali-set'],
      ])}' WHERE id = ${prodMap['aaradhya-burgundy-banarasi-silk-saree']}`
    );

    await queryInterface.bulkInsert(
      'product_categories',
      products.map((p) => ({ product_id: p.id, category_id: p.primary_category_id, created_at: now, updated_at: now }))
    );

    const collectionLinks = [
      { collection_id: colMap['festive-collections'], product_id: prodMap['aaradhya-burgundy-banarasi-silk-saree'], sort_order: 1 },
      { collection_id: colMap['festive-collections'], product_id: prodMap['meenakshi-berry-rose-kanjivaram-saree'], sort_order: 2 },
      { collection_id: colMap['festive-collections'], product_id: prodMap['rajwada-dark-maroon-paithani-saree'], sort_order: 3 },
      { collection_id: colMap['festive-collections'], product_id: prodMap['zoya-wine-burgundy-georgette-saree'], sort_order: 4 },
      { collection_id: colMap['new-arrivals'], product_id: prodMap['meenakshi-berry-rose-kanjivaram-saree'], sort_order: 1 },
      { collection_id: colMap['new-arrivals'], product_id: prodMap['noor-warm-ivory-organza-silk-saree'], sort_order: 2 },
      { collection_id: colMap['new-arrivals'], product_id: prodMap['aahana-blush-pink-jamdani-saree'], sort_order: 3 },
      { collection_id: colMap['new-arrivals'], product_id: prodMap['vanya-champagne-tussar-silk-saree'], sort_order: 4 },
      { collection_id: colMap['best-sellers'], product_id: prodMap['aaradhya-burgundy-banarasi-silk-saree'], sort_order: 1 },
      { collection_id: colMap['best-sellers'], product_id: prodMap['meenakshi-berry-rose-kanjivaram-saree'], sort_order: 2 },
      { collection_id: colMap['nauvari-sarees'], product_id: prodMap['rajwada-royal-paithani-nauvari'], sort_order: 1 },
      { collection_id: colMap['nauvari-sarees'], product_id: prodMap['maharani-traditional-paithani-nauvari'], sort_order: 2 },
      { collection_id: colMap['nauvari-sarees'], product_id: prodMap['brahmani-heritage-cotton-nauvari'], sort_order: 3 },
      { collection_id: colMap['nauvari-sarees'], product_id: prodMap['peshwai-heritage-nine-yard-saree'], sort_order: 4 },
      { collection_id: colMap['jewellery-pairing'], product_id: prodMap['ruhani-champagne-gold-pearl-chandbali-set'], sort_order: 1 },
    ].map((row) => ({ ...row, created_at: now, updated_at: now }));
    await queryInterface.bulkInsert('collection_products', collectionLinks);

    // 8. Product Images — strictly unique per product (never duplicated across different sarees)
    const imagesData = [];
    for (const [slug, meta] of Object.entries(prodMetaBySlug)) {
      if (meta.prod.image_url) {
        imagesData.push({
          product_id: prodMap[slug],
          image_url: meta.prod.image_url,
          alt_text: `${meta.prod.name} — Main Front View`,
          is_primary: true,
          sort_order: 1,
          created_at: now,
          updated_at: now,
        });
      }
    }
    imagesData.push({
      product_id: prodMap[jProd.slug],
      image_url: jProd.image_url,
      alt_text: `${jProd.name} — Primary View`,
      is_primary: true,
      sort_order: 1,
      created_at: now,
      updated_at: now,
    });
    await queryInterface.bulkInsert('product_images', imagesData);

    // 9. Product Variants & Warehouse Stock
    const variantsSeed = products.map((p) => {
      const isJewel = p.slug === jProd.slug;
      const meta = prodMetaBySlug[p.slug];
      const isNauvari = meta?.main?.slug === 'nauvari-sarees';
      return {
        product_id: p.id,
        sku: isJewel ? `${p.sku}-OS` : `${p.sku}-FS`,
        size: isJewel ? 'One Size' : isNauvari ? '9 Yards (Nauvari)' : 'Free Size',
        color_name: isJewel ? 'Champagne Gold' : 'Signature Hue',
        color_hex: '#641B32',
        stock_qty: 12,
        reserved_qty: 0,
        low_stock_threshold: 4,
        is_active: true,
        created_at: now,
        updated_at: now,
      };
    });
    await queryInterface.bulkInsert('product_variants', variantsSeed);

    await queryInterface.bulkInsert('warehouses', [
      {
        name: 'Mumbai Flagship Saree Atelier Warehouse',
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
      { product_id: prodMap['meenakshi-berry-rose-kanjivaram-saree'], user_id: userMap['meera@taantira.com'], rating: 5, title: 'Authentic Kanchipuram lustre', comment: 'Crisp gold temple weave and rich berry rose silk drape. Paired it with the Ruhani chandbalis.', is_verified_purchase: true, is_approved: true, created_at: now, updated_at: now },
      { product_id: prodMap['ruhani-champagne-gold-pearl-chandbali-set'], user_id: userMap['ananya@taantira.com'], rating: 5, title: 'Featherlight saree earrings', comment: 'Matches antique zari borders effortlessly without pulling on the ears.', is_verified_purchase: true, is_approved: true, created_at: now, updated_at: now },
    ]);

    await queryInterface.bulkInsert('product_questions', [
      {
        product_id: prodMap['aaradhya-burgundy-banarasi-silk-saree'],
        user_id: userMap['meera@taantira.com'],
        question: 'Does the saree include an unstitched blouse piece and matching jewellery suggestions?',
        answer: 'Yes, it includes a 0.9m pure katan silk blouse piece, optional custom blouse & petticoat tailoring, and pairs with our Ruhani Champagne Gold Chandbali Set.',
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
      { code: 'SAREE500', description: 'Flat Rs 500 off festive sarees above Rs 4,999', discount_type: 'fixed', discount_value: 500.0, min_purchase_amount: 4999.0, max_discount_amount: 500.0, starts_at: now, expires_at: nextYear, usage_limit: 300, per_customer_limit: 1, used_count: 0, is_active: true, created_at: now, updated_at: now },
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

    // 13. Sample Orders
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
        subtotal: 19400.0,
        discount_amount: 0.0,
        tax_amount: 970.0,
        shipping_fee: 0.0,
        total_amount: 20370.0,
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
        subtotal: 2990.0,
        discount_amount: 0.0,
        tax_amount: 89.7,
        shipping_fee: 0.0,
        total_amount: 3079.7,
        placed_at: now,
        created_at: now,
        updated_at: now,
      },
    ]);

    const [orders] = await queryInterface.sequelize.query('SELECT id, order_number FROM orders');
    const orderMap = Object.fromEntries(orders.map((o) => [o.order_number, o.id]));

    await queryInterface.bulkInsert('order_items', [
      { order_id: orderMap['TAN-2026-1001'], product_id: prodMap['aaradhya-burgundy-banarasi-silk-saree'], variant_id: varMap['TAN-BAN-PS-01-FS'], product_name: 'Aaradhya Deep Burgundy Banarasi Silk Saree', sku: 'TAN-BAN-PS-01-FS', size: 'Free Size', color_name: 'Signature Hue', quantity: 1, unit_price: 14200.0, tax_amount: 639.0, total_price: 14839.0, image_url: '/assets/products/saree-burgundy.jpg', created_at: threeDaysAgo, updated_at: threeDaysAgo },
      { order_id: orderMap['TAN-2026-1002'], product_id: prodMap['meenakshi-berry-rose-kanjivaram-saree'], variant_id: varMap['TAN-KAN-PS-01-FS'], product_name: 'Meenakshi Berry Rose Kanjivaram Silk Saree', sku: 'TAN-KAN-PS-01-FS', size: 'Free Size', color_name: 'Signature Hue', quantity: 1, unit_price: 19400.0, tax_amount: 970.0, total_price: 20370.0, image_url: '/assets/products/saree-kanjivaram-berry.jpg', created_at: now, updated_at: now },
      { order_id: orderMap['TAN-2026-1003'], product_id: prodMap['ruhani-champagne-gold-pearl-chandbali-set'], variant_id: varMap['TAN-JWL-001-OS'], product_name: 'Ruhani Champagne Gold & Pearl Chandbali Jewellery Set', sku: 'TAN-JWL-001-OS', size: 'One Size', color_name: 'Champagne Gold', quantity: 1, unit_price: 2990.0, tax_amount: 89.7, total_price: 3079.7, image_url: '/assets/products/jewellery-chandbali.jpg', created_at: now, updated_at: now },
    ]);

    await queryInterface.bulkInsert('order_addresses', [
      { order_id: orderMap['TAN-2026-1001'], recipient_name: 'Ananya Deshmukh', phone: '9820020001', email: 'ananya@taantira.com', address_line1: '402 Gulmohar Residency, Pali Hill', address_line2: 'Bandra West', city: 'Mumbai', state: 'Maharashtra', pincode: '400050', country: 'India', latitude: 19.0607, longitude: 72.8275, created_at: threeDaysAgo, updated_at: threeDaysAgo },
      { order_id: orderMap['TAN-2026-1002'], recipient_name: 'Ananya Deshmukh', phone: '9820020001', email: 'ananya@taantira.com', address_line1: '402 Gulmohar Residency, Pali Hill', address_line2: 'Bandra West', city: 'Mumbai', state: 'Maharashtra', pincode: '400050', country: 'India', latitude: 19.0607, longitude: 72.8275, created_at: now, updated_at: now },
      { order_id: orderMap['TAN-2026-1003'], recipient_name: 'Meera Iyer', phone: '9820020002', email: 'meera@taantira.com', address_line1: '18 Indiranagar 100 Feet Road', address_line2: 'HAL 2nd Stage', city: 'Bengaluru', state: 'Karnataka', pincode: '560001', country: 'India', latitude: 12.9716, longitude: 77.5946, created_at: now, updated_at: now },
    ]);

    await queryInterface.bulkInsert('payments', [
      { order_id: orderMap['TAN-2026-1001'], user_id: userMap['ananya@taantira.com'], method: 'manual_upi', status: 'paid', amount: 13419.0, currency: 'INR', upi_vpa: 'taantira.atelier@upi', customer_utr: '431988120455', submitted_at: threeDaysAgo, verified_by: userMap['finance@taantira.com'], verified_at: threeDaysAgo, verification_note: 'Verified in bank statement', created_at: threeDaysAgo, updated_at: threeDaysAgo },
      { order_id: orderMap['TAN-2026-1002'], user_id: userMap['ananya@taantira.com'], method: 'cod', status: 'pending', amount: 20370.0, currency: 'INR', created_at: now, updated_at: now },
      { order_id: orderMap['TAN-2026-1003'], user_id: userMap['meera@taantira.com'], method: 'manual_upi', status: 'awaiting_verification', amount: 3079.7, currency: 'INR', upi_vpa: 'taantira.atelier@upi', customer_utr: '432899001122', submitted_at: now, created_at: now, updated_at: now },
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
      { title: 'Timeless Indian Weaves', subtitle: 'Handcrafted Sarees, Heritage Weaves & Elegant Jewellery for Every Occasion', image_url: '/assets/banners/hero-timeless.jpg', cta_text: 'Shop Sarees', cta_link: '/collections/sarees', position: 'hero', sort_order: 1, is_active: true, created_at: now, updated_at: now },
    ]);

    await queryInterface.bulkInsert('promotional_campaigns', [
      { title: 'Taantira Saree Atelier', message: 'Complimentary insured shipping on all sarees above Rs 2,999 • Use code TAANTIRA10 for 10% off', badge_text: 'NEW WEAVES', link_url: '/collections/sarees', is_active: true, created_at: now, updated_at: now },
    ]);

    await queryInterface.bulkInsert('system_settings', [
      { setting_key: 'store_name', setting_value: 'Taantira', group_name: 'store', is_public: true, description: 'Brand store name' },
      { setting_key: 'upi_vpa', setting_value: 'taantira.atelier@upi', group_name: 'payment', is_public: true, description: 'Business UPI VPA for manual UPI payments' },
      { setting_key: 'upi_payee_name', setting_value: 'Taantira Handloom Sarees & Jewellery Atelier', group_name: 'payment', is_public: true, description: 'Payee display name for UPI' },
      { setting_key: 'free_shipping_threshold', setting_value: '2999', group_name: 'shipping', is_public: true, description: 'Free shipping threshold in INR' },
      { setting_key: 'default_shipping_fee', setting_value: '149', group_name: 'shipping', is_public: true, description: 'Default shipping fee below threshold' },
      { setting_key: 'default_tax_rate', setting_value: '5', group_name: 'tax', is_public: true, description: 'Default GST percentage for handloom sarees' },
      { setting_key: 'cod_enabled', setting_value: 'true', group_name: 'payment', is_public: true, description: 'Enable Cash on Delivery' },
    ].map((s) => ({ ...s, created_at: now, updated_at: now })));

    await queryInterface.bulkInsert('notifications', [
      { user_id: userMap['ananya@taantira.com'], title: 'Saree Order Out for Delivery', message: 'Your Kanjivaram saree order TAN-2026-1002 is out for delivery with partner Arjun Kulkarni.', category: 'delivery', link_url: `/account/orders/${orderMap['TAN-2026-1002']}`, is_read: false, created_at: now, updated_at: now },
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
