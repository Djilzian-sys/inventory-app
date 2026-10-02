const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const {
  initDatabase,
  createUser,
  findUserByUsername,
  findUserById,
  updateUserProfile,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  addTransaction,
  getTransactions,
  getDashboardStats,
  getProductById
} = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'inventory-secret-key-change-this';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      storeName: user.store_name || user.storeName
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token tidak valid atau tidak ada.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Sesi login sudah berakhir.' });
  }
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Inventory API berjalan dengan baik.' });
});

app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password, storeName } = req.body;

    if (!username || !email || !password || !storeName) {
      return res.status(400).json({ message: 'Nama toko, username, email, dan password wajib diisi.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password minimal 6 karakter.' });
    }

    const user = await createUser({
      username: String(username).trim(),
      email: String(email).trim(),
      password: String(password),
      storeName: String(storeName).trim()
    });

    const token = createToken(user);
    return res.status(201).json({ token, user });
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Registrasi gagal.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username dan password wajib diisi.' });
    }

    const user = await findUserByUsername(String(username).trim());
    if (!user) {
      return res.status(401).json({ message: 'Username atau password salah.' });
    }

    const isValidPassword = await bcrypt.compare(String(password), user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Username atau password salah.' });
    }

    const safeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      store_name: user.store_name,
      created_at: user.created_at
    };

    const token = createToken(safeUser);
    return res.json({ token, user: safeUser });
  } catch (error) {
    return res.status(500).json({ message: 'Login gagal.' });
  }
});

app.get('/api/me', authMiddleware, async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan.' });
    }

    return res.json({ user });
  } catch (error) {
    return res.status(500).json({ message: 'Gagal mengambil data user.' });
  }
});

app.put('/api/me', authMiddleware, async (req, res) => {
  try {
    const { storeName, email } = req.body;

    const user = await updateUserProfile(req.user.id, { storeName, email });
    const token = createToken(user);

    return res.json({ user, token, message: 'Profil berhasil diperbarui.' });
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Gagal memperbarui profil.' });
  }
});

app.get('/api/products', authMiddleware, async (req, res) => {
  try {
    const products = await getProducts(req.user.id);
    return res.json({ products });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Gagal mengambil data produk.' });
  }
});

app.post('/api/products', authMiddleware, async (req, res) => {
  try {
    const { name, sku, category, description, initialStock, price, minStock } = req.body;
    const product = await createProduct({ name, sku, category, description, initialStock, price, minStock }, req.user.id);
    return res.status(201).json({ product, message: 'Barang berhasil ditambahkan.' });
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Gagal menambahkan barang.' });
  }
});

app.put('/api/products/:id', authMiddleware, async (req, res) => {
  try {
    const product = await updateProduct(Number(req.params.id), req.body, req.user.id);
    return res.json({ product, message: 'Barang berhasil diperbarui.' });
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Gagal memperbarui barang.' });
  }
});

app.delete('/api/products/:id', authMiddleware, async (req, res) => {
  try {
    const product = await deleteProduct(Number(req.params.id), req.user.id);
    return res.json({ product, message: 'Barang berhasil dihapus.' });
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Gagal menghapus barang.' });
  }
});

app.get('/api/transactions', authMiddleware, async (req, res) => {
  try {
    const transactions = await getTransactions(req.user.id);
    return res.json({ transactions });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Gagal mengambil transaksi.' });
  }
});

app.post('/api/transactions', authMiddleware, async (req, res) => {
  try {
    const { productId, type, quantity, note } = req.body;

    if (!productId || !type || !quantity) {
      return res.status(400).json({ message: 'Produk, jenis, dan jumlah transaksi wajib diisi.' });
    }

    const product = await getProductById(Number(productId), req.user.id);
    if (!product) {
      return res.status(404).json({ message: 'Barang tidak ditemukan.' });
    }

    const transaction = await addTransaction({
      productId: Number(productId),
      type,
      quantity: Number(quantity),
      note
    }, req.user.id);

    return res.status(201).json({ transaction, message: `Transaksi ${type === 'in' ? 'masuk' : 'keluar'} berhasil dicatat.` });
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Gagal mencatat transaksi.' });
  }
});

app.get('/api/dashboard', authMiddleware, async (req, res) => {
  try {
    const stats = await getDashboardStats(req.user.id);
    return res.json({ stats });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Gagal mengambil ringkasan dashboard.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function startServer() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`\n🚀 Inventory App berjalan di http://localhost:${PORT}`);
    console.log(`\n📱 Akses di browser atau mobile:`);
    console.log(`   - Lokal: http://localhost:${PORT}`);
    console.log(`   - Dari phone/device lain: http://<IP-KOMPUTER>:${PORT}`);
    console.log(`\n🔑 Akun default:`);
    console.log(`   - Username: admin`);
    console.log(`   - Password: admin123`);
    console.log(`   - Toko: Toko Demo`);
    console.log(`\n💡 Silakan buat akun baru dengan nama toko Anda sendiri.\n`);
  });
}

startServer().catch((error) => {
  console.error('❌ Server gagal start:', error);
  process.exit(1);
});
