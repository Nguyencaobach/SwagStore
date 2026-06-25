'use strict';
const express     = require('express');
const router      = express.Router();
const shopCtrl    = require('../controllers/shopController');
const authCtrl    = require('../controllers/authController');
const staffCtrl   = require('../controllers/staffController');

// ── Shop ──────────────────────────────────────────────────────
router.get('/',             shopCtrl.showShop);
router.post('/cart/add',    shopCtrl.addToCart);
router.get('/cart',         shopCtrl.showCart);
router.post('/cart/update', shopCtrl.updateCart);
router.post('/cart/remove', shopCtrl.removeFromCart);
router.post('/cart/clear',  shopCtrl.clearCart);

// ── Checkout & Orders (login required) ───────────────────────
router.get ('/checkout', authCtrl.requireLogin, shopCtrl.showCheckout);
router.post('/checkout', authCtrl.requireLogin, shopCtrl.placeOrder);
router.get ('/orders',   authCtrl.requireLogin, shopCtrl.showOrderHistory);

// ── Auth ──────────────────────────────────────────────────────
router.get ('/login',    authCtrl.showLogin);
router.post('/login',    authCtrl.login);
router.get ('/logout',   authCtrl.logout);
router.get ('/register', authCtrl.showRegister);
router.post('/register', authCtrl.register);
router.get ('/profile',  authCtrl.requireLogin, authCtrl.showProfile);

// ── Staff (requireStaff) ──────────────────────────────────────
router.get ('/staff/dashboard',           authCtrl.requireStaff, staffCtrl.showDashboard);
router.get ('/staff/orders',              authCtrl.requireStaff, staffCtrl.listOrders);
router.get ('/staff/orders/:id',          authCtrl.requireStaff, staffCtrl.viewOrder);
router.post('/staff/orders/:id/status',   authCtrl.requireStaff, staffCtrl.updateStatus);

module.exports = router;

