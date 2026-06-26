'use strict';

const Order   = require('../models/Order');
const Account = require('../models/Account');
const Product = require('../models/Product');
const Category = require('../models/Category');

const VALID_STATUSES = ['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

// ── GET /staff/customers ────────────────────────────────────────
exports.listCustomers = (req, res) => {
  const { search } = req.query;
  let customers = Account.getAll().filter(a => a.role === 'customer');

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    customers = customers.filter(a =>
      (a.name  || '').toLowerCase().includes(q) ||
      (a.email || '').toLowerCase().includes(q)
    );
  }

  // Gắn thêm số đơn hàng cho mỗi khách
  const Order = require('../models/Order');
  const allOrders = Order.getAll();
  const enriched = customers.map(c => ({
    id:         c.id,
    name:       c.name,
    email:      c.email,
    address:    c.address,
    createdAt:  c.createdAt,
    orderCount: allOrders.filter(o => String(o.userId) === String(c.id)).length,
  }));

  res.render('staff-customers', {
    user:       req.session.user,
    customers:  enriched,
    cartCount:  0,
    search:     search || '',
    totalCount: enriched.length,
  });
};


// ── GET /staff/dashboard ────────────────────────────────────────
exports.showDashboard = (req, res) => {
  const orders     = Order.getAll();
  const accounts   = Account.getAll();
  const customers  = accounts.filter(a => a.role === 'customer');

  const stats = {
    totalOrders:    orders.length,
    totalRevenue:   +orders.reduce((s, o) => s + (o.total || 0), 0).toFixed(2),
    totalCustomers: customers.length,
    pending:        orders.filter(o => o.status === 'confirmed').length,
    processing:     orders.filter(o => o.status === 'processing').length,
    shipped:        orders.filter(o => o.status === 'shipped').length,
    delivered:      orders.filter(o => o.status === 'delivered').length,
    cancelled:      orders.filter(o => o.status === 'cancelled').length,
  };

  // 5 đơn gần nhất
  const recentOrders = [...orders]
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .slice(0, 5)
    .map(o => ({ ...o, statusLabel: statusLabel(o.status) }));

  res.render('staff-dashboard', {
    user:         req.session.user,
    stats,
    recentOrders,
    cartCount:    0,
  });
};

// ── GET /staff/orders ───────────────────────────────────────────
exports.listOrders = (req, res) => {
  const { status, search } = req.query;
  let orders = Order.getAll()
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  if (status && status !== 'all') {
    orders = orders.filter(o => o.status === status);
  }
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    orders = orders.filter(o =>
      (o.id || '').toLowerCase().includes(q) ||
      (o.name || '').toLowerCase().includes(q) ||
      (o.email || '').toLowerCase().includes(q)
    );
  }

  const enriched = orders.map(o => ({ ...o, statusLabel: statusLabel(o.status) }));

  res.render('staff-orders', {
    user:          req.session.user,
    orders:        enriched,
    cartCount:     0,
    activeStatus:  status || 'all',
    search:        search || '',
    totalCount:    enriched.length,
  });
};

// ── GET /staff/orders/:id ───────────────────────────────────────
exports.viewOrder = (req, res) => {
  const order = Order.getById(req.params.id);
  if (!order) return res.status(404).send('<h2>Đơn hàng không tồn tại.</h2>');

  res.render('staff-order-detail', {
    user:      req.session.user,
    order:     { ...order, statusLabel: statusLabel(order.status) },
    statuses:  VALID_STATUSES.map(s => ({ value: s, label: statusLabel(s), selected: s === order.status })),
    cartCount: 0,
    success:   req.query.success === '1',
    error:     req.query.error ? 'Có lỗi xảy ra, vui lòng thử lại.' : null,
  });
};

// ── POST /staff/orders/:id/status ──────────────────────────────
exports.updateStatus = (req, res) => {
  const { status } = req.body;
  if (!VALID_STATUSES.includes(status)) {
    return res.redirect('/staff/orders/' + req.params.id + '?error=invalid');
  }
  try {
    Order.updateStatus(req.params.id, status);
    res.redirect('/staff/orders/' + req.params.id + '?success=1');
  } catch (err) {
    res.redirect('/staff/orders/' + req.params.id + '?error=1');
  }
};

// ── Helper ─────────────────────────────────────────────────────
function statusLabel(status) {
  const map = {
    confirmed:  '\u0110\u00e3 x\u00e1c nh\u1eadn',
    processing: '\u0110ang x\u1eed l\u00fd',
    shipped:    '\u0110ang giao',
    delivered:  '\u0110\u00e3 giao',
    cancelled:  'Đã huỷ',
  };
  return map[status] || status;
}

const VALID_BADGES = ['Bestseller', 'New', 'Sale', 'Limited', 'none'];

// ── GET /staff/products ─────────────────────────────────────────
exports.listProducts = (req, res) => {
  const { search } = req.query;
  let products = Product.getAll();

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    products = products.filter(p =>
      (p.name     || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q) ||
      (p.type     || '').toLowerCase().includes(q)
    );
  }

  res.render('staff-products', {
    user:       req.session.user,
    products,
    cartCount:  0,
    search:     search || '',
    totalCount: products.length,
  });
};

// ── GET /staff/products/new ─────────────────────────────────────
exports.showCreateProduct = (req, res) => {
  res.render('staff-product-form', {
    user:       req.session.user,
    cartCount:  0,
    categories: Category.getAll(),
    types:      Product.getTypes(),
    badges:     VALID_BADGES,
    isNew:      true,
    product:    {},
  });
};

// ── POST /staff/products ────────────────────────────────────────
exports.createProduct = (req, res) => {
  try {
    Product.add(req.body);
    res.redirect('/staff/products?success=created');
  } catch (err) {
    res.render('staff-product-form', {
      user:       req.session.user,
      cartCount:  0,
      categories: Category.getAll(),
      types:      Product.getTypes(),
      badges:     VALID_BADGES,
      isNew:      true,
      product:    req.body,
      error:      err.message,
    });
  }
};

// ── GET /staff/products/:id/edit ────────────────────────────────
exports.showEditProduct = (req, res) => {
  const product = Product.getById(req.params.id);
  if (!product) return res.redirect('/staff/products?error=notfound');

  res.render('staff-product-form', {
    user:       req.session.user,
    cartCount:  0,
    categories: Category.getAll(),
    types:      Product.getTypes(),
    badges:     VALID_BADGES,
    isNew:      false,
    product,
  });
};

// ── POST /staff/products/:id/edit ───────────────────────────────
exports.updateProduct = (req, res) => {
  try {
    Product.update(req.params.id, req.body);
    res.redirect('/staff/products?success=updated');
  } catch (err) {
    const product = Product.getById(req.params.id) || req.body;
    res.render('staff-product-form', {
      user:       req.session.user,
      cartCount:  0,
      categories: Category.getAll(),
      types:      Product.getTypes(),
      badges:     VALID_BADGES,
      isNew:      false,
      product:    { ...product, ...req.body, id: req.params.id },
      error:      err.message,
    });
  }
};

// ── POST /staff/products/:id/delete ─────────────────────────────
exports.deleteProduct = (req, res) => {
  try {
    Product.delete(req.params.id);
    res.redirect('/staff/products?success=deleted');
  } catch (err) {
    res.redirect('/staff/products?error=deletefail');
  }
};
