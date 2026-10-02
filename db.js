const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const dbDirectory = path.join(__dirname, 'data');
fs.mkdirSync(dbDirectory, { recursive: true });

const dbPath = path.join(dbDirectory, 'inventory.db');
const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function initDatabase() {
  db.serialize(async () => {
    db.run('PRAGMA foreign_keys = ON;');

    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        sku TEXT NOT NULL UNIQUE,
        category TEXT,
        description TEXT,
        stock INTEGER NOT NULL DEFAULT 0,
        created_by INTEGER NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('in', 'out')),
        quantity INTEGER NOT NULL CHECK(quantity > 0),
        note TEXT,
        created_by INTEGER NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    const adminUser = await get('SELECT id FROM users WHERE username = ?', ['admin']);
    if (!adminUser) {
      const passwordHash = await bcrypt.hash('admin123', 10);
      await run(
        'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
        ['admin', 'admin@inventory.local', passwordHash]
      );
    }
  });
}

async function createUser({ username, email, password }) {
  const existing = await get('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
  if (existing) {
    throw new Error('Username atau email sudah terdaftar.');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await run(
    'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
    [username.trim(), email.trim(), passwordHash]
  );

  return await get('SELECT id, username, email, created_at FROM users WHERE id = ?', [result.id]);
}

async function findUserByUsername(username) {
  return await get('SELECT * FROM users WHERE username = ?', [username]);
}

async function getProducts() {
  return await all(`
    SELECT p.*, u.username AS created_by_name
    FROM products p
    LEFT JOIN users u ON u.id = p.created_by
    ORDER BY p.created_at DESC
  `);
}

async function getProductById(id) {
  return await get(`
    SELECT p.*, u.username AS created_by_name
    FROM products p
    LEFT JOIN users u ON u.id = p.created_by
    WHERE p.id = ?
  `, [id]);
}

async function createProduct({ name, sku, category, description, initialStock }, createdBy) {
  const cleanName = name.trim();
  const cleanSku = sku.trim();

  if (!cleanName || !cleanSku) {
    throw new Error('Nama barang dan SKU wajib diisi.');
  }

  const existingProduct = await get('SELECT id FROM products WHERE sku = ?', [cleanSku]);
  if (existingProduct) {
    throw new Error('SKU sudah digunakan. Gunakan SKU lain.');
  }

  const result = await run(
    `INSERT INTO products (name, sku, category, description, stock, created_by) VALUES (?, ?, ?, ?, ?, ?)`,
    [cleanName, cleanSku, category || 'Umum', description || '', Number(initialStock) || 0, createdBy]
  );

  const newProduct = await getProductById(result.id);

  if (Number(initialStock) > 0) {
    await addTransaction({ productId: result.id, type: 'in', quantity: Number(initialStock), note: 'Stok awal', createdBy });
    newProduct.stock = Number(initialStock);
  }

  return newProduct;
}

async function updateProduct(id, payload) {
  const product = await getProductById(id);
  if (!product) throw new Error('Barang tidak ditemukan.');

  const updatedName = payload.name?.trim() || product.name;
  const updatedSku = payload.sku?.trim() || product.sku;
  const updatedCategory = payload.category?.trim() || product.category;
  const updatedDescription = payload.description?.trim() ?? product.description;

  if (updatedSku !== product.sku) {
    const skuExists = await get('SELECT id FROM products WHERE sku = ? AND id != ?', [updatedSku, id]);
    if (skuExists) {
      throw new Error('SKU sudah digunakan.');
    }
  }

  await run(
    `UPDATE products SET name = ?, sku = ?, category = ?, description = ? WHERE id = ?`,
    [updatedName, updatedSku, updatedCategory, updatedDescription, id]
  );

  return await getProductById(id);
}

async function deleteProduct(id) {
  const product = await getProductById(id);
  if (!product) throw new Error('Barang tidak ditemukan.');

  await run('DELETE FROM products WHERE id = ?', [id]);
  return product;
}

async function addTransaction({ productId, type, quantity, note }, createdBy) {
  const product = await getProductById(productId);
  if (!product) throw new Error('Barang tidak ditemukan.');

  const qty = Number(quantity);
  if (!['in', 'out'].includes(type)) {
    throw new Error('Jenis transaksi tidak valid.');
  }

  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error('Jumlah harus lebih dari 0.');
  }

  if (type === 'out' && qty > product.stock) {
    throw new Error(`Stok tidak mencukupi. Stok saat ini: ${product.stock}`);
  }

  const transaction = await run(
    `INSERT INTO transactions (product_id, type, quantity, note, created_by) VALUES (?, ?, ?, ?, ?)`,
    [productId, type, qty, note || '', createdBy]
  );

  const nextStock = type === 'in' ? product.stock + qty : product.stock - qty;
  await run('UPDATE products SET stock = ? WHERE id = ?', [nextStock, productId]);

  return { id: transaction.id, product_id: productId, type, quantity: qty, note: note || '', created_by: createdBy };
}

async function getTransactions() {
  return await all(`
    SELECT t.*, p.name AS product_name, u.username AS created_by_name
    FROM transactions t
    JOIN products p ON p.id = t.product_id
    JOIN users u ON u.id = t.created_by
    ORDER BY t.created_at DESC
  `);
}

async function getDashboardStats() {
  const [productsCount, totalStock, incoming, outgoing] = await Promise.all([
    get('SELECT COUNT(*) AS total FROM products'),
    get('SELECT COALESCE(SUM(stock), 0) AS total FROM products'),
    get('SELECT COALESCE(SUM(quantity), 0) AS total FROM transactions WHERE type = ?', ['in']),
    get('SELECT COALESCE(SUM(quantity), 0) AS total FROM transactions WHERE type = ?', ['out'])
  ]);

  const lowStock = await all('SELECT * FROM products WHERE stock <= 5 ORDER BY stock ASC LIMIT 10');

  return {
    totalProducts: productsCount.total,
    totalStock: totalStock.total,
    incomingQty: incoming.total,
    outgoingQty: outgoing.total,
    lowStock
  };
}

module.exports = {
  db,
  initDatabase,
  run,
  get,
  all,
  createUser,
  findUserByUsername,
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  addTransaction,
  getTransactions,
  getDashboardStats
};
