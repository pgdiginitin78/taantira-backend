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
