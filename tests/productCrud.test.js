'use strict';

const fs        = require('fs');
const path      = require('path');
const Product   = require('../models/Product');
const staffCtrl = require('../controllers/staffController');

const productsFile = path.join(__dirname, '..', 'data', 'products.json');
const productsBak  = productsFile + '.bak';

// ── Helpers ─────────────────────────────────────────────────────
function mockReq(overrides = {}) {
  return {
    session: { user: { id: 999, name: 'Staff', role: 'staff' } },
    query:   {},
    params:  {},
    body:    {},
    ...overrides,
  };
}
function mockRes() {
  const res = {};
  res.render   = jest.fn(() => res);
  res.redirect = jest.fn(() => res);
  res.status   = jest.fn(() => res);
  res.send     = jest.fn(() => res);
  res.locals   = {};
  return res;
}

const SAMPLE = { name: 'Test Shirt', price: '19.99', category: 'Apparel', type: 'T-Shirt', badge: 'New', desc: 'A test shirt', image: '/images/test.svg' };

// ── Setup / Teardown ────────────────────────────────────────────
beforeAll(() => { if (fs.existsSync(productsFile)) fs.copyFileSync(productsFile, productsBak); });
afterAll(() => {
  if (fs.existsSync(productsBak)) { fs.copyFileSync(productsBak, productsFile); fs.unlinkSync(productsBak); }
});
beforeEach(() => fs.writeFileSync(productsFile, '[]'));
afterEach(() =>  fs.writeFileSync(productsFile, '[]'));

// ══════════════════════════════════════════════════════════════════
// Product Model
// ══════════════════════════════════════════════════════════════════
describe('Product.add', () => {
  test('adds a product and returns it with generated id', () => {
    const p = Product.add(SAMPLE);
    expect(p.id).toBeDefined();
    expect(p.name).toBe('Test Shirt');
    expect(p.price).toBe(19.99);
  });

  test('auto-increments id', () => {
    const p1 = Product.add(SAMPLE);
    const p2 = Product.add({ ...SAMPLE, name: 'Second Shirt' });
    expect(p2.id).toBeGreaterThan(p1.id);
  });

  test('throws if required fields are missing', () => {
    expect(() => Product.add({ name: '', price: '', category: '', type: '' }))
      .toThrow();
  });

  test('stores null badge when badge is "none"', () => {
    const p = Product.add({ ...SAMPLE, badge: 'none' });
    expect(p.badge).toBeNull();
  });
});

describe('Product.update', () => {
  test('updates fields correctly', () => {
    const added  = Product.add(SAMPLE);
    const updated = Product.update(added.id, { ...SAMPLE, name: 'Updated Shirt', price: '25.00' });
    expect(updated.name).toBe('Updated Shirt');
    expect(updated.price).toBe(25.00);
  });

  test('throws if product not found', () => {
    expect(() => Product.update(9999, SAMPLE)).toThrow('Sản phẩm không tồn tại.');
  });

  test('throws if required fields missing on update', () => {
    const p = Product.add(SAMPLE);
    expect(() => Product.update(p.id, { name: '', price: '', category: '', type: '' })).toThrow();
  });
});

describe('Product.delete', () => {
  test('removes the product from list', () => {
    const p = Product.add(SAMPLE);
    Product.delete(p.id);
    expect(Product.getById(p.id)).toBeNull();
  });

  test('returns the removed product', () => {
    const p    = Product.add(SAMPLE);
    const removed = Product.delete(p.id);
    expect(removed.name).toBe('Test Shirt');
  });

  test('throws if product not found', () => {
    expect(() => Product.delete(9999)).toThrow('Sản phẩm không tồn tại.');
  });
});

describe('Product.getById', () => {
  test('returns product by id', () => {
    const p = Product.add(SAMPLE);
    expect(Product.getById(p.id).name).toBe('Test Shirt');
  });

  test('returns null for unknown id', () => {
    expect(Product.getById(9999)).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════════
// staffController — Product CRUD actions
// ══════════════════════════════════════════════════════════════════
describe('staffCtrl.listProducts', () => {
  test('renders staff-products with all products', () => {
    Product.add(SAMPLE);
    Product.add({ ...SAMPLE, name: 'Jacket', type: 'Fleece Jacket' });
    const req = mockReq();
    const res = mockRes();
    staffCtrl.listProducts(req, res);
    expect(res.render).toHaveBeenCalledWith('staff-products', expect.objectContaining({ totalCount: 2 }));
  });

  test('filters products by name search', () => {
    Product.add(SAMPLE);
    Product.add({ ...SAMPLE, name: 'Blue Jacket', type: 'Fleece Jacket' });
    const req = mockReq({ query: { search: 'jacket' } });
    const res = mockRes();
    staffCtrl.listProducts(req, res);
    expect(res.render.mock.calls[0][1].totalCount).toBe(1);
  });

  test('returns empty list when no products', () => {
    const res = mockRes();
    staffCtrl.listProducts(mockReq(), res);
    expect(res.render.mock.calls[0][1].totalCount).toBe(0);
  });
});

describe('staffCtrl.createProduct', () => {
  test('adds product and redirects with success', () => {
    const req = mockReq({ body: SAMPLE });
    const res = mockRes();
    staffCtrl.createProduct(req, res);
    expect(res.redirect).toHaveBeenCalledWith('/staff/products?success=created');
    expect(Product.getAll()).toHaveLength(1);
  });

  test('renders form with error when fields missing', () => {
    const req = mockReq({ body: { name: '', price: '', category: '', type: '' } });
    const res = mockRes();
    staffCtrl.createProduct(req, res);
    expect(res.render).toHaveBeenCalledWith('staff-product-form', expect.objectContaining({ error: expect.any(String) }));
  });
});

describe('staffCtrl.updateProduct', () => {
  test('updates product and redirects with success', () => {
    const p   = Product.add(SAMPLE);
    const req = mockReq({ params: { id: String(p.id) }, body: { ...SAMPLE, name: 'Updated' } });
    const res = mockRes();
    staffCtrl.updateProduct(req, res);
    expect(res.redirect).toHaveBeenCalledWith('/staff/products?success=updated');
    expect(Product.getById(p.id).name).toBe('Updated');
  });

  test('renders form with error when update fails', () => {
    const req = mockReq({ params: { id: '9999' }, body: SAMPLE });
    const res = mockRes();
    staffCtrl.updateProduct(req, res);
    expect(res.render).toHaveBeenCalledWith('staff-product-form', expect.objectContaining({ error: expect.any(String) }));
  });
});

describe('staffCtrl.deleteProduct', () => {
  test('deletes product and redirects with success', () => {
    const p   = Product.add(SAMPLE);
    const req = mockReq({ params: { id: String(p.id) } });
    const res = mockRes();
    staffCtrl.deleteProduct(req, res);
    expect(res.redirect).toHaveBeenCalledWith('/staff/products?success=deleted');
    expect(Product.getAll()).toHaveLength(0);
  });

  test('redirects with error when product not found', () => {
    const req = mockReq({ params: { id: '9999' } });
    const res = mockRes();
    staffCtrl.deleteProduct(req, res);
    expect(res.redirect).toHaveBeenCalledWith('/staff/products?error=deletefail');
  });
});
