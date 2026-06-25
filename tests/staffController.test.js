'use strict';

const fs        = require('fs');
const path      = require('path');
const Account   = require('../models/Account');
const Order     = require('../models/Order');
const staffCtrl = require('../controllers/staffController');

// ── File paths ──────────────────────────────────────────────────
const accountsFile = path.join(__dirname, '..', 'data', 'accounts.json');
const ordersFile   = path.join(__dirname, '..', 'data', 'orders.json');
const accountsBak  = accountsFile + '.bak';
const ordersBak    = ordersFile   + '.bak';

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

// ── Setup / Teardown ────────────────────────────────────────────
beforeAll(() => {
  if (fs.existsSync(accountsFile)) fs.copyFileSync(accountsFile, accountsBak);
  if (fs.existsSync(ordersFile))   fs.copyFileSync(ordersFile,   ordersBak);
});

afterAll(() => {
  if (fs.existsSync(accountsBak)) { fs.copyFileSync(accountsBak, accountsFile); fs.unlinkSync(accountsBak); }
  if (fs.existsSync(ordersBak))   { fs.copyFileSync(ordersBak,   ordersFile);   fs.unlinkSync(ordersBak); }
});

beforeEach(() => {
  fs.writeFileSync(accountsFile, '[]');
  fs.writeFileSync(ordersFile,   '[]');
});

afterEach(() => {
  fs.writeFileSync(accountsFile, '[]');
  fs.writeFileSync(ordersFile,   '[]');
});

// ══════════════════════════════════════════════════════════════════
// listCustomers
// ══════════════════════════════════════════════════════════════════
describe('listCustomers', () => {

  test('renders staff-customers with only customer accounts', () => {
    // Tạo 2 customer + 1 staff
    Account.add({ name: 'Alice', email: 'alice@test.com', password: 'p1', address: 'HCM' });
    Account.add({ name: 'Bob',   email: 'bob@test.com',   password: 'p2', address: 'HN'  });
    // Thêm thẳng vào file để mock staff role
    const accounts = Account.getAll();
    accounts.push({ id: 555, name: 'Staff User', email: 'staff@test.com', address: 'HQ', passwordHash: 'x', role: 'staff', createdAt: new Date().toISOString() });
    fs.writeFileSync(accountsFile, JSON.stringify(accounts, null, 2));

    const req = mockReq();
    const res = mockRes();
    staffCtrl.listCustomers(req, res);

    expect(res.render).toHaveBeenCalledWith('staff-customers', expect.objectContaining({
      totalCount: 2,
    }));
    const args = res.render.mock.calls[0][1];
    // Không được có staff trong danh sách
    expect(args.customers.every(c => c.email !== 'staff@test.com')).toBe(true);
  });

  test('returns empty list when no customers exist', () => {
    const req = mockReq();
    const res = mockRes();
    staffCtrl.listCustomers(req, res);

    const args = res.render.mock.calls[0][1];
    expect(args.totalCount).toBe(0);
    expect(args.customers).toHaveLength(0);
  });

  test('filters customers by name search', () => {
    Account.add({ name: 'Alice Wonder', email: 'alice@test.com', password: 'p', address: 'HCM' });
    Account.add({ name: 'Bob Smith',   email: 'bob@test.com',   password: 'p', address: 'HN'  });

    const req = mockReq({ query: { search: 'alice' } });
    const res = mockRes();
    staffCtrl.listCustomers(req, res);

    const args = res.render.mock.calls[0][1];
    expect(args.totalCount).toBe(1);
    expect(args.customers[0].name).toBe('Alice Wonder');
  });

  test('filters customers by email search', () => {
    Account.add({ name: 'Alice', email: 'alice@test.com', password: 'p', address: 'HCM' });
    Account.add({ name: 'Bob',   email: 'bob@example.com', password: 'p', address: 'HN' });

    const req = mockReq({ query: { search: 'example' } });
    const res = mockRes();
    staffCtrl.listCustomers(req, res);

    const args = res.render.mock.calls[0][1];
    expect(args.totalCount).toBe(1);
    expect(args.customers[0].email).toBe('bob@example.com');
  });

  test('returns all customers when search is empty string', () => {
    Account.add({ name: 'A', email: 'a@test.com', password: 'p', address: 'x' });
    Account.add({ name: 'B', email: 'b@test.com', password: 'p', address: 'y' });

    const req = mockReq({ query: { search: '' } });
    const res = mockRes();
    staffCtrl.listCustomers(req, res);

    expect(res.render.mock.calls[0][1].totalCount).toBe(2);
  });

  test('attaches correct orderCount for each customer', () => {
    Account.add({ name: 'Charlie', email: 'charlie@test.com', password: 'p', address: 'HCM' });
    const charlie = Account.findByEmail('charlie@test.com');

    // Tạo 2 đơn hàng cho Charlie
    Order.add({ id: 'ORD-001', userId: charlie.id, total: 10, items: [] });
    Order.add({ id: 'ORD-002', userId: charlie.id, total: 20, items: [] });

    const req = mockReq();
    const res = mockRes();
    staffCtrl.listCustomers(req, res);

    const args   = res.render.mock.calls[0][1];
    const found  = args.customers.find(c => c.email === 'charlie@test.com');
    expect(found.orderCount).toBe(2);
  });

  test('passes search string back to view', () => {
    const req = mockReq({ query: { search: 'xyz' } });
    const res = mockRes();
    staffCtrl.listCustomers(req, res);

    expect(res.render.mock.calls[0][1].search).toBe('xyz');
  });
});
