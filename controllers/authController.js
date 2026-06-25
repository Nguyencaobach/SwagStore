'use strict';

const Account = require('../models/Account');
const Cart    = require('../models/Cart');

function getCart(req) {
  return new Cart(req.session.cart || {});
}

exports.requireLogin = (req, res, next) => {
  if (req.session.user) return next();
  res.redirect('/login?error=1');
};

exports.requireStaff = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'staff') return next();
  if (!req.session.user) return res.redirect('/login?error=1');
  res.redirect('/login?error=forbidden');
};

exports.showLogin = (req, res) => {
  const cart = getCart(req);
  let errorMsg = null;
  if (req.query.error === '1')         errorMsg = 'Vui lòng đăng nhập để tiếp tục.';
  if (req.query.error === 'forbidden')  errorMsg = 'Bạn không có quyền truy cập khu vực này.';
  res.render('login', {
    cartCount:      cart.count,
    error:          errorMsg,
    successMessage: req.query.registered === '1' ? 'Đăng ký thành công. Vui lòng đăng nhập.' : null,
  });
};

exports.login = (req, res) => {
  const { email, password } = req.body;
  const cart = getCart(req);

  if (!email || !password) {
    return res.render('login', {
      error: 'Please fill in all fields.',
      cartCount: cart.count,
      form: { email },
    });
  }

  const user = Account.authenticate(email, password);
  if (!user) {
    return res.render('login', {
      error: 'Invalid email or password.',
      cartCount: cart.count,
      form: { email },
    });
  }

  req.session.user = {
    id:      user.id,
    name:    user.name,
    email:   user.email,
    address: user.address || '',
    role:    user.role    || 'customer',
  };
  res.locals.user = req.session.user;

  // Redirect: staff → dashboard, customer → checkout nếu có giỏ, else home
  if (req.session.user.role === 'staff') return res.redirect('/staff/dashboard');
  const cart2 = getCart(req);
  res.redirect(cart2.count > 0 ? '/checkout' : '/');
};

exports.logout = (req, res) => {
  delete req.session.user;
  res.redirect('/');
};

exports.showRegister = (req, res) => {
  const cart = getCart(req);
  res.render('register', {
    cartCount: cart.count,
    success:   req.query.success === '1',
  });
};

exports.register = (req, res) => {
  const { name, email, password, address } = req.body;
  const cart = getCart(req);

  if (!name || !email || !password || !address) {
    return res.render('register', {
      error:     'Please fill in all fields.',
      cartCount: cart.count,
      form:      { name, email, address },
    });
  }

  try {
    Account.add({ name, email, password, address });
    res.redirect('/login?registered=1');
  } catch (err) {
    res.render('register', {
      error:     err.message,
      cartCount: cart.count,
      form:      { name, email, address },
    });
  }
};

exports.showProfile = (req, res) => {
  const cart = getCart(req);
  res.render('profile', {
    user:      req.session.user,
    cartCount: cart.count,
  });
};
