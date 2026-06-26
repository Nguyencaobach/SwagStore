'use strict';

const fs       = require('fs');
const path     = require('path');
const Category = require('./Category');

const dataFile  = path.join(__dirname, '..', 'data', 'products.json');
const typesFile = path.join(__dirname, '..', 'data', 'types.json');

function readProducts() {
  try {
    const raw = fs.readFileSync(dataFile, 'utf8');
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (_) { return []; }
}

function writeProducts(products) {
  fs.writeFileSync(dataFile, JSON.stringify(products, null, 2));
}

function readTypes() {
  try {
    const raw = fs.readFileSync(typesFile, 'utf8');
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (_) { return []; }
}

class Product {
  static getAll()    { return readProducts(); }
  static getTypes()  { return readTypes(); }

  static getById(id) {
    return readProducts().find(p => p.id === Number(id)) || null;
  }

  static getCategories() { return Category.getAll(); }

  // ── CREATE ──────────────────────────────────────────────────────
  static add({ name, price, category, type, badge, desc, image, stock }) {
    if (!name || !price || !category || !type) {
      throw new Error('Vui lòng điền đủ tên, giá, danh mục và loại sản phẩm.');
    }
    const products  = readProducts();
    const maxId     = products.reduce((m, p) => Math.max(m, p.id || 0), 0);
    const stockNum  = stock !== undefined && stock !== '' ? parseInt(stock, 10) : null;
    const newProduct = {
      id:       maxId + 1,
      name:     String(name).trim(),
      price:    +parseFloat(price).toFixed(2),
      image:    image ? String(image).trim() : '/images/placeholder.svg',
      category: String(category).trim(),
      type:     String(type).trim(),
      badge:    badge && badge !== 'none' ? String(badge).trim() : null,
      desc:     desc  ? String(desc).trim()  : '',
      stock:    (!isNaN(stockNum) && stockNum !== null) ? stockNum : null,
    };
    products.push(newProduct);
    writeProducts(products);
    return newProduct;
  }

  // ── UPDATE ──────────────────────────────────────────────────────
  static update(id, fields) {
    const products = readProducts();
    const idx = products.findIndex(p => p.id === Number(id));
    if (idx === -1) throw new Error('Sản phẩm không tồn tại.');

    const { name, price, category, type, badge, desc, image, stock } = fields;
    if (!name || !price || !category || !type) {
      throw new Error('Vui lòng điền đủ tên, giá, danh mục và loại sản phẩm.');
    }

    const stockNum = stock !== undefined && stock !== '' ? parseInt(stock, 10) : null;
    products[idx] = {
      ...products[idx],
      name:     String(name).trim(),
      price:    +parseFloat(price).toFixed(2),
      image:    image ? String(image).trim() : products[idx].image,
      category: String(category).trim(),
      type:     String(type).trim(),
      badge:    badge && badge !== 'none' ? String(badge).trim() : null,
      desc:     desc ? String(desc).trim() : '',
      stock:    (!isNaN(stockNum) && stockNum !== null) ? stockNum : products[idx].stock ?? null,
    };
    writeProducts(products);
    return products[idx];
  }

  // ── DELETE ──────────────────────────────────────────────────────
  static delete(id) {
    const products = readProducts();
    const idx = products.findIndex(p => p.id === Number(id));
    if (idx === -1) throw new Error('Sản phẩm không tồn tại.');
    const [removed] = products.splice(idx, 1);
    writeProducts(products);
    return removed;
  }

  static count() { return readProducts().length; }
}

module.exports = Product;
