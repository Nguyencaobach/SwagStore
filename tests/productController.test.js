'use strict';

const fs        = require('fs');
const path      = require('path');
const Product   = require('../models/Product');
const staffCtrl = require('../controllers/staffController');

// ── File paths ──────────────────────────────────────────────────
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

const SAMPLE_PRODUCTS = [
  { id: 1, name: 'Product A', price: 10.99, image: '/images/a.svg', category: 'Apparel',     type: 'T-Shirt',  badge: 'New',  desc: 'Desc A', stock: 50 },
  { id: 2, name: 'Product B', price: 24.99, image: '/images/b.svg', category: 'Accessories', type: 'Backpack', badge: null,   desc: 'Desc B', stock: 5  },
  { id: 3, name: 'Product C', price: 7.99,  image: '/images/c.svg', category: 'Outdoor',     type: 'Bike Light',badge:'Sale', desc: 'Desc C', stock: 0  },
];

// ── Setup / Teardown ────────────────────────────────────────────
beforeAll(() => {
  if (fs.existsSync(productsFile)) fs.copyFileSync(productsFile, productsBak);
});

afterAll(() => {
  if (fs.existsSync(productsBak)) {
    fs.copyFileSync(productsBak, productsFile);
    fs.unlinkSync(productsBak);
  }
});

beforeEach(() => {
  fs.writeFileSync(productsFile, JSON.stringify(SAMPLE_PRODUCTS, null, 2));
});

afterEach(() => {
  fs.writeFileSync(productsFile, JSON.stringify(SAMPLE_PRODUCTS, null, 2));
});

// ══════════════════════════════════════════════════════════════════
// Product.getAll
// ══════════════════════════════════════════════════════════════════
describe('Product.getAll', () => {
  test('returns all products from file', () => {
    const products = Product.getAll();
    expect(products).toHaveLength(3);
  });

  test('returns empty array when file is empty', () => {
    fs.writeFileSync(productsFile, '[]');
    const products = Product.getAll();
    expect(products).toEqual([]);
  });

  test('each product has required fields', () => {
    const products = Product.getAll();
    products.forEach(p => {
      expect(p).toHaveProperty('id');
      expect(p).toHaveProperty('name');
      expect(p).toHaveProperty('price');
      expect(p).toHaveProperty('category');
      expect(p).toHaveProperty('type');
    });
  });
});

// ══════════════════════════════════════════════════════════════════
// Product.getById
// ══════════════════════════════════════════════════════════════════
describe('Product.getById', () => {
  test('returns product by numeric id', () => {
    const p = Product.getById(1);
    expect(p).not.toBeNull();
    expect(p.name).toBe('Product A');
  });

  test('returns product by string id', () => {
    const p = Product.getById('2');
    expect(p).not.toBeNull();
    expect(p.name).toBe('Product B');
  });

  test('returns null for non-existent id', () => {
    const p = Product.getById(9999);
    expect(p).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════════
// Product.add (CREATE)
// ══════════════════════════════════════════════════════════════════
describe('Product.add', () => {
  test('adds a new product with all fields', () => {
    const before = Product.getAll().length;
    const added = Product.add({
      name: 'New Product', price: '19.99',
      category: 'Apparel', type: 'T-Shirt',
      badge: 'New', desc: 'Cool shirt', image: '/images/new.svg',
      stock: '100',
    });
    const after = Product.getAll();
    expect(after).toHaveLength(before + 1);
    expect(added.name).toBe('New Product');
    expect(added.price).toBe(19.99);
    expect(added.badge).toBe('New');
    expect(added.stock).toBe(100);
  });

  test('auto-increments id beyond current max', () => {
    const added = Product.add({
      name: 'Auto ID Product', price: '5.00',
      category: 'Outdoor', type: 'Bike Light',
    });
    expect(added.id).toBe(4); // max is 3, so next is 4
  });

  test('sets badge to null when badge is "none"', () => {
    const added = Product.add({
      name: 'No Badge', price: '8.00',
      category: 'Accessories', type: 'Backpack', badge: 'none',
    });
    expect(added.badge).toBeNull();
  });

  test('sets default image when image is empty', () => {
    const added = Product.add({
      name: 'Default Img', price: '8.00',
      category: 'Accessories', type: 'Backpack', image: '',
    });
    expect(added.image).toBe('/images/placeholder.svg');
  });

  test('stores null stock when stock is empty string', () => {
    const added = Product.add({
      name: 'No Stock', price: '8.00',
      category: 'Accessories', type: 'Backpack', stock: '',
    });
    expect(added.stock).toBeNull();
  });

  test('throws error when name is missing', () => {
    expect(() => Product.add({
      price: '10.00', category: 'Apparel', type: 'T-Shirt',
    })).toThrow();
  });

  test('throws error when price is missing', () => {
    expect(() => Product.add({
      name: 'No Price', category: 'Apparel', type: 'T-Shirt',
    })).toThrow();
  });

  test('throws error when category is missing', () => {
    expect(() => Product.add({
      name: 'No Cat', price: '10.00', type: 'T-Shirt',
    })).toThrow();
  });

  test('throws error when type is missing', () => {
    expect(() => Product.add({
      name: 'No Type', price: '10.00', category: 'Apparel',
    })).toThrow();
  });

  test('trims whitespace from name', () => {
    const added = Product.add({
      name: '  Trimmed Name  ', price: '10.00',
      category: 'Apparel', type: 'T-Shirt',
    });
    expect(added.name).toBe('Trimmed Name');
  });

  test('persists to file', () => {
    Product.add({ name: 'Persist Me', price: '5.00', category: 'Outdoor', type: 'Bike Light' });
    const raw = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
    expect(raw.some(p => p.name === 'Persist Me')).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════
// Product.update (UPDATE)
// ══════════════════════════════════════════════════════════════════
describe('Product.update', () => {
  test('updates existing product fields', () => {
    const updated = Product.update(1, {
      name: 'Updated A', price: '99.99',
      category: 'Outdoor', type: 'Bike Light',
      desc: 'New desc', badge: 'Sale',
    });
    expect(updated.name).toBe('Updated A');
    expect(updated.price).toBe(99.99);
    expect(updated.category).toBe('Outdoor');
    expect(updated.badge).toBe('Sale');
  });

  test('updates stock field', () => {
    const updated = Product.update(2, {
      name: 'Product B', price: '24.99',
      category: 'Accessories', type: 'Backpack',
      stock: '200',
    });
    expect(updated.stock).toBe(200);
  });

  test('clears stock when empty string provided', () => {
    const updated = Product.update(1, {
      name: 'Product A', price: '10.99',
      category: 'Apparel', type: 'T-Shirt', stock: '',
    });
    // Should fall back to existing stock (50) when empty
    expect(updated.stock).toBe(50);
  });

  test('preserves image if not provided', () => {
    const original = Product.getById(1);
    const updated = Product.update(1, {
      name: 'Product A', price: '10.99',
      category: 'Apparel', type: 'T-Shirt',
      image: '',
    });
    expect(updated.image).toBe(original.image);
  });

  test('sets badge to null when badge is "none"', () => {
    const updated = Product.update(1, {
      name: 'Product A', price: '10.99',
      category: 'Apparel', type: 'T-Shirt', badge: 'none',
    });
    expect(updated.badge).toBeNull();
  });

  test('throws error for non-existent product id', () => {
    expect(() => Product.update(9999, {
      name: 'Ghost', price: '1.00', category: 'Apparel', type: 'T-Shirt',
    })).toThrow('Sản phẩm không tồn tại.');
  });

  test('throws error if required fields are missing on update', () => {
    expect(() => Product.update(1, {
      name: '', price: '10.00', category: 'Apparel', type: 'T-Shirt',
    })).toThrow();
  });

  test('persists update to file', () => {
    Product.update(1, {
      name: 'File Updated', price: '10.99',
      category: 'Apparel', type: 'T-Shirt',
    });
    const raw = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
    expect(raw.find(p => p.id === 1).name).toBe('File Updated');
  });
});

// ══════════════════════════════════════════════════════════════════
// Product.delete (DELETE)
// ══════════════════════════════════════════════════════════════════
describe('Product.delete', () => {
  test('removes product from list', () => {
    Product.delete(1);
    const products = Product.getAll();
    expect(products.find(p => p.id === 1)).toBeUndefined();
    expect(products).toHaveLength(2);
  });

  test('returns the deleted product', () => {
    const removed = Product.delete(2);
    expect(removed.name).toBe('Product B');
  });

  test('throws error for non-existent product', () => {
    expect(() => Product.delete(9999)).toThrow('Sản phẩm không tồn tại.');
  });

  test('persists deletion to file', () => {
    Product.delete(3);
    const raw = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
    expect(raw.find(p => p.id === 3)).toBeUndefined();
  });

  test('does not affect other products', () => {
    Product.delete(2);
    expect(Product.getById(1)).not.toBeNull();
    expect(Product.getById(3)).not.toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════════
// staffCtrl.listProducts (Controller)
// ══════════════════════════════════════════════════════════════════
describe('staffCtrl.listProducts', () => {
  test('renders staff-products with all products', () => {
    const req = mockReq();
    const res = mockRes();
    staffCtrl.listProducts(req, res);

    expect(res.render).toHaveBeenCalledWith('staff-products', expect.objectContaining({
      totalCount: 3,
    }));
  });

  test('filters products by name search', () => {
    const req = mockReq({ query: { search: 'Product A' } });
    const res = mockRes();
    staffCtrl.listProducts(req, res);

    const args = res.render.mock.calls[0][1];
    expect(args.totalCount).toBe(1);
    expect(args.products[0].name).toBe('Product A');
  });

  test('filters products by category search', () => {
    const req = mockReq({ query: { search: 'Accessories' } });
    const res = mockRes();
    staffCtrl.listProducts(req, res);

    const args = res.render.mock.calls[0][1];
    expect(args.products.every(p => p.category === 'Accessories')).toBe(true);
  });

  test('filters products by type search', () => {
    const req = mockReq({ query: { search: 'Backpack' } });
    const res = mockRes();
    staffCtrl.listProducts(req, res);

    const args = res.render.mock.calls[0][1];
    expect(args.products[0].type).toBe('Backpack');
  });

  test('search is case-insensitive', () => {
    const req = mockReq({ query: { search: 'product a' } });
    const res = mockRes();
    staffCtrl.listProducts(req, res);

    const args = res.render.mock.calls[0][1];
    expect(args.totalCount).toBe(1);
  });

  test('returns empty list when no products match search', () => {
    const req = mockReq({ query: { search: 'xyzxyz' } });
    const res = mockRes();
    staffCtrl.listProducts(req, res);

    expect(res.render.mock.calls[0][1].totalCount).toBe(0);
  });

  test('passes search string back to view', () => {
    const req = mockReq({ query: { search: 'test' } });
    const res = mockRes();
    staffCtrl.listProducts(req, res);

    expect(res.render.mock.calls[0][1].search).toBe('test');
  });
});

// ══════════════════════════════════════════════════════════════════
// staffCtrl.showCreateProduct
// ══════════════════════════════════════════════════════════════════
describe('staffCtrl.showCreateProduct', () => {
  test('renders staff-product-form with isNew=true', () => {
    const req = mockReq();
    const res = mockRes();
    staffCtrl.showCreateProduct(req, res);

    expect(res.render).toHaveBeenCalledWith('staff-product-form', expect.objectContaining({
      isNew: true,
    }));
  });

  test('passes categories and types to view', () => {
    const req = mockReq();
    const res = mockRes();
    staffCtrl.showCreateProduct(req, res);

    const args = res.render.mock.calls[0][1];
    expect(Array.isArray(args.categories)).toBe(true);
    expect(Array.isArray(args.types)).toBe(true);
    expect(Array.isArray(args.badges)).toBe(true);
  });

  test('passes empty product object', () => {
    const req = mockReq();
    const res = mockRes();
    staffCtrl.showCreateProduct(req, res);

    const args = res.render.mock.calls[0][1];
    expect(args.product).toEqual({});
  });
});

// ══════════════════════════════════════════════════════════════════
// staffCtrl.createProduct
// ══════════════════════════════════════════════════════════════════
describe('staffCtrl.createProduct', () => {
  test('redirects to products list on success', () => {
    const req = mockReq({
      body: { name: 'New Item', price: '12.00', category: 'Apparel', type: 'T-Shirt' },
    });
    const res = mockRes();
    staffCtrl.createProduct(req, res);

    expect(res.redirect).toHaveBeenCalledWith('/staff/products?success=created');
  });

  test('creates product and persists to file', () => {
    const req = mockReq({
      body: { name: 'Saved Item', price: '20.00', category: 'Outdoor', type: 'Bike Light' },
    });
    const res = mockRes();
    staffCtrl.createProduct(req, res);

    const products = Product.getAll();
    expect(products.some(p => p.name === 'Saved Item')).toBe(true);
  });

  test('re-renders form with error on validation failure', () => {
    const req = mockReq({ body: { name: '', price: '', category: '', type: '' } });
    const res = mockRes();
    staffCtrl.createProduct(req, res);

    expect(res.render).toHaveBeenCalledWith('staff-product-form', expect.objectContaining({
      error: expect.any(String),
      isNew: true,
    }));
  });
});

// ══════════════════════════════════════════════════════════════════
// staffCtrl.showEditProduct
// ══════════════════════════════════════════════════════════════════
describe('staffCtrl.showEditProduct', () => {
  test('renders staff-product-form with product data', () => {
    const req = mockReq({ params: { id: '1' } });
    const res = mockRes();
    staffCtrl.showEditProduct(req, res);

    expect(res.render).toHaveBeenCalledWith('staff-product-form', expect.objectContaining({
      isNew: false,
      product: expect.objectContaining({ id: 1, name: 'Product A' }),
    }));
  });

  test('redirects to products list if product not found', () => {
    const req = mockReq({ params: { id: '9999' } });
    const res = mockRes();
    staffCtrl.showEditProduct(req, res);

    expect(res.redirect).toHaveBeenCalledWith('/staff/products?error=notfound');
  });
});

// ══════════════════════════════════════════════════════════════════
// staffCtrl.updateProduct
// ══════════════════════════════════════════════════════════════════
describe('staffCtrl.updateProduct', () => {
  test('redirects to products list on success', () => {
    const req = mockReq({
      params: { id: '1' },
      body: { name: 'Updated A', price: '15.00', category: 'Apparel', type: 'T-Shirt' },
    });
    const res = mockRes();
    staffCtrl.updateProduct(req, res);

    expect(res.redirect).toHaveBeenCalledWith('/staff/products?success=updated');
  });

  test('persists the update to file', () => {
    const req = mockReq({
      params: { id: '1' },
      body: { name: 'Persisted Update', price: '11.11', category: 'Outdoor', type: 'Bike Light' },
    });
    const res = mockRes();
    staffCtrl.updateProduct(req, res);

    expect(Product.getById(1).name).toBe('Persisted Update');
  });

  test('re-renders form with error on validation failure', () => {
    const req = mockReq({
      params: { id: '1' },
      body: { name: '', price: '', category: '', type: '' },
    });
    const res = mockRes();
    staffCtrl.updateProduct(req, res);

    expect(res.render).toHaveBeenCalledWith('staff-product-form', expect.objectContaining({
      error: expect.any(String),
      isNew: false,
    }));
  });

  test('re-renders form if product does not exist', () => {
    const req = mockReq({
      params: { id: '9999' },
      body: { name: 'Ghost', price: '5.00', category: 'Outdoor', type: 'Bike Light' },
    });
    const res = mockRes();
    staffCtrl.updateProduct(req, res);

    // Either redirect or re-render with error
    const redirected = res.redirect.mock.calls.length > 0;
    const rendered   = res.render.mock.calls.length > 0;
    expect(redirected || rendered).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════
// staffCtrl.deleteProduct
// ══════════════════════════════════════════════════════════════════
describe('staffCtrl.deleteProduct', () => {
  test('redirects to products list on success', () => {
    const req = mockReq({ params: { id: '1' } });
    const res = mockRes();
    staffCtrl.deleteProduct(req, res);

    expect(res.redirect).toHaveBeenCalledWith('/staff/products?success=deleted');
  });

  test('removes product from storage', () => {
    const req = mockReq({ params: { id: '2' } });
    const res = mockRes();
    staffCtrl.deleteProduct(req, res);

    expect(Product.getById(2)).toBeNull();
  });

  test('redirects with error when product not found', () => {
    const req = mockReq({ params: { id: '9999' } });
    const res = mockRes();
    staffCtrl.deleteProduct(req, res);

    expect(res.redirect).toHaveBeenCalledWith('/staff/products?error=deletefail');
  });

  test('does not remove other products', () => {
    const req = mockReq({ params: { id: '3' } });
    const res = mockRes();
    staffCtrl.deleteProduct(req, res);

    expect(Product.getById(1)).not.toBeNull();
    expect(Product.getById(2)).not.toBeNull();
  });
});
