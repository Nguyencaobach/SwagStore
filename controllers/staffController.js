'use strict';

const Order   = require('../models/Order');
const Account = require('../models/Account');

const VALID_STATUSES = ['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

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
    cancelled:  '\u0110\u00e3 hu\u1ef7',
  };
  return map[status] || status;
}
