'use strict';

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const heroBanners = [
      {
        title: 'Timeless Indian Weaves',
        subtitle: 'Handcrafted Sarees, Heritage Weaves & Elegant Jewellery for Every Occasion',
        image_url: '/assets/banners/hero-timeless.jpg',
        cta_text: 'Shop Sarees',
        cta_link: '/collections/sarees',
        position: 'hero',
        sort_order: 1,
        is_active: true,
      },
      {
        title: 'Regal Nauvari Drapes',
        subtitle: 'Authentic Traditional Paithani, Peshwai, Brahmani, Koli & Ready-to-Wear 9 Vaari Sarees',
        image_url: '/assets/banners/hero-festive.jpg',
        cta_text: 'Shop Nauvari',
        cta_link: '/collections/nauvari-sarees',
        position: 'hero',
        sort_order: 2,
        is_active: true,
      },
      {
        title: 'Bridal Zari Heirlooms',
        subtitle: 'Pure Katan Banarasi, Korvai Kanjivaram & Antique Gold Zari Sarees for Festive Ceremonies',
        image_url: '/assets/banners/hero-timeless.jpg',
        cta_text: 'Shop Banarasi',
        cta_link: '/collections/banarasi-sarees',
        position: 'hero',
        sort_order: 3,
        is_active: true,
      },
      {
        title: 'Paired Heritage Jewels',
        subtitle: 'Champagne Gold Chandbalis, Kundan Jhumkas & Traditional Naths Finely Matched to Every Drape',
        image_url: '/assets/banners/hero-festive.jpg',
        cta_text: 'Shop Jewellery',
        cta_link: '/collections/jewellery',
        position: 'hero',
        sort_order: 4,
        is_active: true,
      },
    ];

    const [existingBanners] = await queryInterface.sequelize.query(
      'SELECT id, title FROM banners'
    );
    const bannerByTitle = new Map(existingBanners.map((b) => [b.title, b]));

    for (const banner of heroBanners) {
      if (!bannerByTitle.has(banner.title)) {
        await queryInterface.bulkInsert('banners', [
          {
            ...banner,
            created_at: now,
            updated_at: now,
          },
        ]);
      }
    }

    const [jewelleryCats] = await queryInterface.sequelize.query(
      "SELECT id FROM categories WHERE slug = 'jewellery' LIMIT 1"
    );
    const jewelleryCatId = jewelleryCats[0]?.id;
    if (!jewelleryCatId) return;

    const [warehouses] = await queryInterface.sequelize.query(
      'SELECT id FROM warehouses ORDER BY id ASC LIMIT 1'
    );
    const warehouseId = warehouses[0]?.id || 1;

    const jewelleryProducts = [
      {
        name: 'Kundan & Meenakari Bridal Jhumka Earrings',
        slug: 'kundan-meenakari-bridal-jhumka-earrings',
        sku: 'TAN-JWL-002',
        fabric: 'Gold-Plated Brass & Kundan',
        occasion: 'Bridal & Festive Saree Pairing',
        base_price: 3200.0,
        sale_price: 2490.0,
        tax_rate: 3.0,
        length_width: 'Drop Length: 6.2 cm',
        wash_care: 'Wipe with dry chamois cloth and store in airtight pouch',
        short_description: 'Lightweight gold-toned kundan jhumkas sculpted for Banarasi and Jamdani silk drapes.',
        description:
          'Artisanal Kundan and Enamel Meenakari jhumkas crafted to pair effortlessly with pure silk sarees without weighing down delicate festive styling.',
        color_name: 'Antique Gold',
        color_hex: '#C39A52',
        size: 'One Size',
        stock_qty: 15,
      },
      {
        name: 'Sculpted Antique Gold Temple Choker Necklace',
        slug: 'sculpted-antique-gold-temple-choker-necklace',
        sku: 'TAN-JWL-003',
        fabric: 'Kempu Stones & Gold-Plated Alloy',
        occasion: 'Kanjivaram & Ceremonial Edit',
        base_price: 4800.0,
        sale_price: 3990.0,
        tax_rate: 3.0,
        length_width: 'Adjustable Dori • 16 inch Collar',
        wash_care: 'Keep away from perfume and moisture',
        short_description: 'Heritage South Indian temple motif collar designed for rich gold-zari Kanjivaram pallus.',
        description:
          'Classic temple motif choker finished in antique matte gold tone with filigree lotus embellishments to complement pure Kanjivaram and Tussar weaves.',
        color_name: 'Temple Gold',
        color_hex: '#B8860B',
        size: 'Adjustable',
        stock_qty: 10,
      },
      {
        name: 'Maharashtrian Pearl & Gold Moti Nath',
        slug: 'maharashtrian-pearl-gold-moti-nath',
        sku: 'TAN-JWL-004',
        fabric: 'Freshwater Seed Pearls & Gold-Plated Wire',
        occasion: 'Nauvari & Paithani Bridal',
        base_price: 1900.0,
        sale_price: 1490.0,
        tax_rate: 3.0,
        length_width: 'Clip-On / Pressed Fit',
        wash_care: 'Store inside cushioned velvet keepsake box',
        short_description: 'Signature Brahmani & Peshwai pearl-cluster nath crafted for nine-yard Nauvari and Paithani drapes.',
        description:
          'Traditional Maharashtrian moti nath woven with lustrous seed pearls and ruby-accent filigree, engineered with a gentle press-clasp suitable for pierced and non-pierced wear.',
        color_name: 'Pearl Gold',
        color_hex: '#EFE0C8',
        size: 'Free Size',
        stock_qty: 18,
      },
      {
        name: 'Kolhapuri Saaj & Thushi Heritage Necklace Set',
        slug: 'kolhapuri-saaj-thushi-heritage-necklace-set',
        sku: 'TAN-JWL-005',
        fabric: 'Micro-Gold Plated Beadwork',
        occasion: 'Paithani & Nauvari Trousseau',
        base_price: 4200.0,
        sale_price: 3450.0,
        tax_rate: 3.0,
        length_width: 'Adjustable Thread • 18 inch Set',
        wash_care: 'Store flat away from direct sunlight',
        short_description: 'Heirloom Maharashtrian thushi & Kolhapuri saaj ensemble calibrated for Nauvari and Yeola Paithani silks.',
        description:
          'Crisply articulated gold-beaded thushi paired with traditional Kolhapuri saaj emblems that echo peacock and lotus Paithani borders.',
        color_name: 'Matte Gold',
        color_hex: '#C59B43',
        size: 'Adjustable',
        stock_qty: 12,
      },
    ];

    const [existingProducts] = await queryInterface.sequelize.query(
      'SELECT id, slug FROM products'
    );
    const prodIdBySlug = new Map(existingProducts.map((p) => [p.slug, p.id]));

    for (const item of jewelleryProducts) {
      let productId = prodIdBySlug.get(item.slug);
      if (!productId) {
        await queryInterface.bulkInsert('products', [
          {
            name: item.name,
            slug: item.slug,
            sku: item.sku,
            primary_category_id: jewelleryCatId,
            short_description: item.short_description,
            description: item.description,
            story: 'Curated inside Taantira Heritage Saree Jewellery Capsule to pair seamlessly with silk weaves.',
            base_price: item.base_price,
            sale_price: item.sale_price,
            tax_rate: item.tax_rate,
            fabric: item.fabric,
            occasion: item.occasion,
            length_width: item.length_width,
            wash_care: item.wash_care,
            manufacturing_info: 'Crafted by heritage karigars in Jaipur & Kolhapur',
            country_of_origin: 'India',
            return_policy: '7-day easy return on unworn jewellery',
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
        ]);

        const [insertedRows] = await queryInterface.sequelize.query(
          `SELECT id FROM products WHERE slug = '${item.slug}' LIMIT 1`
        );
        productId = insertedRows[0]?.id;
      }
      if (!productId) continue;

      const [catLinks] = await queryInterface.sequelize.query(
        `SELECT id FROM product_categories WHERE product_id = ${productId} AND category_id = ${jewelleryCatId} LIMIT 1`
      );
      if (catLinks.length === 0) {
        await queryInterface.bulkInsert('product_categories', [
          {
            product_id: productId,
            category_id: jewelleryCatId,
            created_at: now,
            updated_at: now,
          },
        ]);
      }

      const [existingVars] = await queryInterface.sequelize.query(
        `SELECT id FROM product_variants WHERE product_id = ${productId} LIMIT 1`
      );
      let variantId = existingVars[0]?.id;
      if (!variantId) {
        await queryInterface.bulkInsert('product_variants', [
          {
            product_id: productId,
            sku: `${item.sku}-OS`,
            size: item.size,
            color_name: item.color_name,
            color_hex: item.color_hex,
            stock_qty: item.stock_qty,
            reserved_qty: 0,
            low_stock_threshold: 3,
            is_active: true,
            created_at: now,
            updated_at: now,
          },
        ]);

        const [insertedVars] = await queryInterface.sequelize.query(
          `SELECT id FROM product_variants WHERE product_id = ${productId} LIMIT 1`
        );
        variantId = insertedVars[0]?.id;
      }

      if (variantId) {
        const [stockRows] = await queryInterface.sequelize.query(
          `SELECT id FROM warehouse_stock WHERE warehouse_id = ${warehouseId} AND variant_id = ${variantId} LIMIT 1`
        );
        if (stockRows.length === 0) {
          await queryInterface.bulkInsert('warehouse_stock', [
            {
              warehouse_id: warehouseId,
              variant_id: variantId,
              quantity_on_hand: item.stock_qty,
              quantity_reserved: 0,
              reorder_level: 3,
              created_at: now,
              updated_at: now,
            },
          ]);
        }
      }
    }
  },

  async down(queryInterface) {
    const slugs = [
      'kundan-meenakari-bridal-jhumka-earrings',
      'sculpted-antique-gold-temple-choker-necklace',
      'maharashtrian-pearl-gold-moti-nath',
      'kolhapuri-saaj-thushi-heritage-necklace-set',
    ];
    for (const slug of slugs) {
      await queryInterface.bulkDelete('products', { slug }, {});
    }
    const bannerTitles = [
      'Regal Nauvari Drapes',
      'Bridal Zari Heirlooms',
      'Paired Heritage Jewels',
    ];
    for (const title of bannerTitles) {
      await queryInterface.bulkDelete('banners', { title }, {});
    }
  },
};
