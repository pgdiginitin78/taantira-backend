const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createApp } = require('../src/index');
const {
  registerSchema,
  loginSchema,
  addressSchema,
} = require('../src/validators/auth.validators');
const {
  checkoutSchema,
  upiSubmitSchema,
} = require('../src/validators/order.validators');
const {
  partnerRegisterSchema,
  completeDeliveryOtpSchema,
} = require('../src/validators/delivery.validators');
const {
  calculateCustomOptionFee,
  roundCurrency,
} = require('../src/services/pricing.service');
const { requireRoles, requirePermissions } = require('../src/middleware/rbac');
const { hasValidMagicBytes } = require('../src/middleware/upload');

const requestJson = (server, method, path, body = null, headers = {}) =>
  new Promise((resolve, reject) => {
    const addr = server.address();
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: addr.port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...headers,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, headers: res.headers, body: data });
          }
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });

test('GET /api/health returns exact success contract and security headers', async () => {
  const app = createApp();
  const server = app.listen(0);
  try {
    const res = await requestJson(server, 'GET', '/api/health');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, {
      success: true,
      message: 'Taantira API is running',
    });
    assert.ok(res.headers['x-content-type-options']);
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test('Protected endpoints reject unauthenticated requests with 401', async () => {
  const app = createApp();
  const server = app.listen(0);
  try {
    const [ordersRes, adminRes, deliveryRes] = await Promise.all([
      requestJson(server, 'GET', '/api/orders'),
      requestJson(server, 'GET', '/api/admin/dashboard'),
      requestJson(server, 'GET', '/api/delivery/partner/dashboard'),
    ]);
    assert.equal(ordersRes.status, 401);
    assert.equal(adminRes.status, 401);
    assert.equal(deliveryRes.status, 401);
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test('Yup middleware rejects invalid register/checkout/OTP payloads with 422 before hitting DB', async () => {
  const app = createApp();
  const server = app.listen(0);
  try {
    const badReg = await requestJson(server, 'POST', '/api/auth/register', {
      full_name: 'A',
      email: 'not-an-email',
      phone: '12',
      password: '123',
    });
    assert.equal(badReg.status, 422);
    assert.equal(badReg.body.code, 'VALIDATION_ERROR');
    assert.ok(badReg.body.errors.email);
    assert.ok(badReg.body.errors.password);

    const badPartner = await requestJson(server, 'POST', '/api/delivery/partners/register', {
      full_name: 'Partner',
      email: 'bad',
    });
    assert.equal(badPartner.status, 422);
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test('Yup schemas enforce business constraints across auth, checkout, UPI, and delivery OTP', async () => {
  await assert.rejects(() => loginSchema.validate({ email: 'bad', password: '' }));
  await assert.rejects(() => addressSchema.validate({ pincode: '4000' }));
  await assert.rejects(() => upiSubmitSchema.validate({ utr_number: '12' }));
  await assert.rejects(() => completeDeliveryOtpSchema.validate({ otp: '12ab' }));
  await assert.rejects(() =>
    checkoutSchema.validate({ payment_method: 'stripe', delivery_mode: 'own_partner' })
  );

  const validReg = await registerSchema.validate({
    full_name: 'Kavya Sharma',
    email: 'KAVYA@TAANTIRA.COM',
    phone: '9820012345',
    password: 'StrongPassword@1',
  });
  assert.equal(validReg.email, 'kavya@taantira.com');

  const validOtp = await completeDeliveryOtpSchema.validate({ otp: '482910', cod_collected: true });
  assert.equal(validOtp.otp, '482910');

  const validPartner = await partnerRegisterSchema.validate({
    full_name: 'Rohan Patil',
    email: 'rohan@taantira.com',
    phone: '9820098200',
    password: 'StrongPassword@1',
    address: '12 MG Road',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    service_pincodes: ['400001', '400050'],
    vehicle_type: 'Electric Scooter',
    vehicle_number: 'MH01EV1001',
    doc_type: 'Driving Licence',
    doc_number_masked: 'MH01-XXXX-1001',
  });
  assert.equal(validPartner.pincode, '400001');
});

test('Pricing helper only charges blouse/petticoat add-ons when category supports them', () => {
  const sareeCategory = {
    supports_blouse_option: true,
    supports_petticoat_option: true,
    supports_gift_options: true,
  };
  const dressCategory = {
    supports_blouse_option: false,
    supports_petticoat_option: false,
    supports_gift_options: true,
  };
  const options = { matching_blouse: true, petticoat: true, gift_wrap: true };

  assert.equal(calculateCustomOptionFee(options, sareeCategory), 2000);
  assert.equal(calculateCustomOptionFee(options, dressCategory), 150);
  assert.equal(roundCurrency(10.005), 10.01);
});

test('RBAC middleware enforces roles and permissions cleanly', () => {
  const nextCalls = [];
  const next = (err) => nextCalls.push(err || 'OK');

  const permCheck = requirePermissions('payments.manage');
  permCheck({ user: { roles: ['customer'], permissions: [] } }, {}, next);
  assert.equal(nextCalls[0].statusCode, 403);

  permCheck({ user: { roles: ['finance_manager'], permissions: ['payments.manage'] } }, {}, next);
  assert.equal(nextCalls[1], 'OK');

  const roleCheck = requireRoles('delivery_partner');
  roleCheck({ user: { roles: ['super_admin'] } }, {}, next);
  assert.equal(nextCalls[2], 'OK');
});

test('Upload magic-byte verifier validates real image signatures and rejects spoofed files', () => {
  const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
  const fakePng = Buffer.from('not a real png file here');

  assert.equal(hasValidMagicBytes(pngHeader, 'image/png'), true);
  assert.equal(hasValidMagicBytes(fakePng, 'image/png'), false);
});

test('Saree catalogue enforces 7 main categories, 42 subcategories, 210 unique sarees, and zero duplicated images', () => {
  const { MAIN_CATEGORIES, JEWELLERY_CATEGORY } = require('../src/data/sareeCatalogueData');

  assert.equal(MAIN_CATEGORIES.length, 7);
  const subCategories = MAIN_CATEGORIES.flatMap((m) => m.subcategories);
  assert.equal(subCategories.length, 42);

  const allProducts = [];
  const nameSet = new Set();
  const slugSet = new Set();
  const skuSet = new Set();
  const imageOwnerMap = new Map();

  for (const main of MAIN_CATEGORIES) {
    for (const sub of main.subcategories) {
      assert.equal(sub.products.length, 5, `${sub.slug} must contain exactly 5 sarees`);
      for (const prod of sub.products) {
        assert.ok(!nameSet.has(prod.name), `Duplicate saree name: ${prod.name}`);
        assert.ok(!slugSet.has(prod.slug), `Duplicate saree slug: ${prod.slug}`);
        assert.ok(!skuSet.has(prod.sku), `Duplicate saree SKU: ${prod.sku}`);
        nameSet.add(prod.name);
        slugSet.add(prod.slug);
        skuSet.add(prod.sku);
        if (prod.image_url) {
          assert.ok(!imageOwnerMap.has(prod.image_url), `Image ${prod.image_url} reused on multiple products`);
          imageOwnerMap.set(prod.image_url, prod.slug);
        }
        allProducts.push({ ...prod, mainSlug: main.slug, subSlug: sub.slug });
      }
    }
  }

  assert.equal(allProducts.length, 210);
  const nauvariCount = allProducts.filter((p) => p.mainSlug === 'nauvari-sarees').length;
  assert.equal(nauvariCount, 30);
  assert.ok(!imageOwnerMap.has(JEWELLERY_CATEGORY.product.image_url));
});

test('Catalogue filter service supports multi-select Category, Subcategory, Fabric, Search, and empty states', () => {
  const { MAIN_CATEGORIES, JEWELLERY_CATEGORY } = require('../src/data/sareeCatalogueData');
  const {
    filterCatalogueRecords,
    buildGalleryAngles,
    getMatchingJewellery,
  } = require('../src/services/catalogueFilter.service');

  const built = [];
  for (const main of MAIN_CATEGORIES) {
    for (const sub of main.subcategories) {
      for (const prod of sub.products) {
        built.push({
          ...prod,
          fabric: sub.fabric,
          primaryCategory: { slug: sub.slug, name: sub.name, parent: { slug: main.slug, name: main.name } },
          images: prod.image_url ? [{ image_url: prod.image_url, sort_order: 1, is_primary: true }] : [],
          variants: [{ id: 1, stock_qty: 12 }],
        });
      }
    }
  }
  built.push({
    ...JEWELLERY_CATEGORY.product,
    primaryCategory: { slug: 'jewellery', name: JEWELLERY_CATEGORY.name, parent: null },
    images: [{ image_url: JEWELLERY_CATEGORY.product.image_url, sort_order: 1, is_primary: true }],
    variants: [{ id: 999, stock_qty: 20 }],
  });

  // Multi-select Category filter
  const banarasiAndKanjivaram = filterCatalogueRecords(built, {
    categories: ['banarasi-sarees', 'kanjivaram-sarees'],
  });
  assert.equal(banarasiAndKanjivaram.length, 50);

  // Multi-select Subcategory filter
  const mixedSub = filterCatalogueRecords(built, {
    subcategories: ['pure-banarasi-silk', 'peshwai-nauvari'],
  });
  assert.equal(mixedSub.length, 10);

  // Multi-select Fabric filter (4 Organza subcategories + 1 Linen subcategory = 25)
  const organzaAndLinen = filterCatalogueRecords(built, { fabrics: ['Organza', 'Linen'] });
  assert.equal(organzaAndLinen.length, 25);

  // Combined Category + Fabric + Search filter
  const combinedNauvariCotton = filterCatalogueRecords(built, {
    categories: ['nauvari-sarees'],
    fabrics: ['Cotton'],
  });
  assert.equal(combinedNauvariCotton.length, 15);

  const searchMatches = filterCatalogueRecords(built, { q: 'Paithani' });
  assert.ok(searchMatches.length >= 20);

  // Empty state intersection
  const impossible = filterCatalogueRecords(built, {
    categories: ['banarasi-sarees'],
    fabrics: ['Linen'],
  });
  assert.equal(impossible.length, 0);

  // 5-angle gallery contract & honest missing-angle state
  const aaradhya = built.find((p) => p.slug === 'aaradhya-burgundy-banarasi-silk-saree');
  const angles = buildGalleryAngles(aaradhya);
  assert.equal(angles.length, 5);
  assert.equal(angles[0].status, 'available');
  assert.equal(angles[1].status, 'image-needed');
  assert.equal(angles[4].status, 'image-needed');

  // Matching jewellery rules
  const nauvariJewels = getMatchingJewellery('nauvari-sarees');
  assert.ok(nauvariJewels.some((j) => j.name.includes('Nath')));
});
