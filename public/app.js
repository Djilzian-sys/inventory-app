const authView = document.getElementById('authView');
const appView = document.getElementById('appView');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const tabs = document.querySelectorAll('.tab');
const toast = document.getElementById('toast');
const welcomeText = document.getElementById('welcomeText');
const storeName = document.getElementById('storeName');
const logoutBtn = document.getElementById('logoutBtn');
const profileBtn = document.getElementById('profileBtn');
const profileModal = document.getElementById('profileModal');
const profileForm = document.getElementById('profileForm');
const closeProfileBtn = document.getElementById('closeProfileBtn');
const cancelProfileBtn = document.getElementById('cancelProfileBtn');

const totalProductsEl = document.getElementById('totalProducts');
const totalStockEl = document.getElementById('totalStock');
const incomingQtyEl = document.getElementById('incomingQty');
const outgoingQtyEl = document.getElementById('outgoingQty');
const productTableBody = document.getElementById('productTableBody');
const transactionTableBody = document.getElementById('transactionTableBody');
const transactionProductSelect = document.getElementById('transactionProduct');
const lowStockAlert = document.getElementById('lowStockAlert');
const lowStockList = document.getElementById('lowStockList');

const tokenKey = 'inventoryAuthToken';
let currentUser = null;

function showToast(message, type = 'default') {
  toast.textContent = message;
  toast.className = 'toast show ' + type;
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
}

function getToken() {
  return localStorage.getItem(tokenKey);
}

function setToken(token) {
  if (token) {
    localStorage.setItem(tokenKey, token);
  } else {
    localStorage.removeItem(tokenKey);
  }
}

function switchTab(targetId) {
  tabs.forEach((tab) => {
    const isActive = tab.dataset.target === targetId;
    tab.classList.toggle('active', isActive);
  });

  document.querySelectorAll('.auth-form').forEach((form) => {
    form.classList.toggle('active', form.id === targetId);
  });
}

async function api(path, options = {}) {
  const token = getToken();
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`/api${path}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Request gagal.');
  }

  return data;
}

function renderAuthState(isLoggedIn, user = null) {
  if (isLoggedIn && user) {
    authView.classList.add('hidden');
    appView.classList.remove('hidden');
    currentUser = user;
    welcomeText.textContent = `Selamat datang, ${user.username}`;
    storeName.textContent = user.store_name || 'Toko Saya';
  } else {
    authView.classList.remove('hidden');
    appView.classList.add('hidden');
    welcomeText.textContent = '';
    storeName.textContent = 'Toko Saya';
    currentUser = null;
  }
}

async function loadDashboard() {
  try {
    const [{ stats }, { products }, { transactions }] = await Promise.all([
      api('/dashboard'),
      api('/products'),
      api('/transactions')
    ]);

    totalProductsEl.textContent = stats.totalProducts;
    totalStockEl.textContent = stats.totalStock;
    incomingQtyEl.textContent = stats.incomingQty;
    outgoingQtyEl.textContent = stats.outgoingQty;

    renderProductOptions(products);
    renderProductsTable(products);
    renderTransactionsTable(transactions);
    renderLowStockAlert(stats.lowStock);
  } catch (error) {
    showToast('Gagal memuat data: ' + error.message, 'error');
  }
}

function renderProductOptions(products) {
  transactionProductSelect.innerHTML = '<option value="">Pilih barang</option>';

  products.forEach((product) => {
    const option = document.createElement('option');
    option.value = product.id;
    option.textContent = `${product.name} (stok ${product.stock})`;
    transactionProductSelect.appendChild(option);
  });
}

function renderProductsTable(products) {
  if (!products.length) {
    productTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">Belum ada barang. Tambahkan barang di form di atas.</td></tr>';
    return;
  }

  productTableBody.innerHTML = products
    .map(
      (product) => `
        <tr>
          <td><strong>${product.name}</strong></td>
          <td><code>${product.sku}</code></td>
          <td>${product.category || '-'}</td>
          <td>Rp ${Number(product.price || 0).toLocaleString('id-ID')}</td>
          <td><strong style="color: ${product.stock <= product.min_stock ? '#ef4444' : '#10b981'};">${product.stock}</strong></td>
          <td>
            <button class="delete-btn" data-id="${product.id}">Hapus</button>
          </td>
        </tr>
      `
    )
    .join('');

  productTableBody.querySelectorAll('.delete-btn').forEach((button) => {
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      if (confirm('Yakin ingin menghapus barang ini?')) {
        try {
          await api(`/products/${button.dataset.id}`, { method: 'DELETE' });
          showToast('Barang berhasil dihapus.', 'success');
          await loadDashboard();
        } catch (error) {
          showToast(error.message, 'error');
        }
      }
    });
  });
}

function renderTransactionsTable(transactions) {
  if (!transactions.length) {
    transactionTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">Belum ada transaksi.</td></tr>';
    return;
  }

  transactionTableBody.innerHTML = transactions
    .map(
      (tx) => `
        <tr>
          <td>${tx.product_name}</td>
          <td>
            <span class="status-badge ${tx.type === 'in' ? 'status-in' : 'status-out'}">${tx.type === 'in' ? '📥 Masuk' : '📤 Keluar'}</span>
          </td>
          <td>${tx.quantity}</td>
          <td>${tx.note || '-'}</td>
          <td>${new Date(tx.created_at).toLocaleDateString('id-ID')} ${new Date(tx.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</td>
        </tr>
      `
    )
    .join('');
}

function renderLowStockAlert(lowStockItems) {
  if (!lowStockItems || lowStockItems.length === 0) {
    lowStockAlert.classList.add('hidden');
    return;
  }

  lowStockAlert.classList.remove('hidden');
  lowStockList.innerHTML = lowStockItems
    .map(
      (item) => `
        <div class="low-stock-item">
          <strong>${item.name}</strong> - Stok: ${item.stock} (Min: ${item.min_stock})
        </div>
      `
    )
    .join('');
}

async function loadUserSession() {
  const token = getToken();
  if (!token) {
    renderAuthState(false);
    return;
  }

  try {
    const data = await api('/me');
    renderAuthState(true, data.user);
    await loadDashboard();
  } catch (error) {
    setToken(null);
    renderAuthState(false);
    showToast('Sesi berakhir, silakan login ulang.', 'error');
  }
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!username || !password) {
    showToast('Username dan password wajib diisi.', 'error');
    return;
  }

  try {
    const data = await api('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });

    setToken(data.token);
    renderAuthState(true, data.user);
    await loadDashboard();
    loginForm.reset();
    showToast('Login berhasil!', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
});

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const storeName = document.getElementById('registerStoreName').value.trim();
  const username = document.getElementById('registerUsername').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;

  if (!storeName || !username || !email || !password) {
    showToast('Semua field wajib diisi.', 'error');
    return;
  }

  if (password.length < 6) {
    showToast('Password minimal 6 karakter.', 'error');
    return;
  }

  try {
    const data = await api('/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password, storeName })
    });

    setToken(data.token);
    renderAuthState(true, data.user);
    await loadDashboard();
    registerForm.reset();
    switchTab('loginForm');
    showToast(`Selamat datang di ${data.user.store_name}!`, 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
});

// PROFILE MODAL
profileBtn.addEventListener('click', async () => {
  try {
    const { user } = await api('/me');
    document.getElementById('profileStoreName').value = user.store_name || '';
    document.getElementById('profileEmail').value = user.email || '';
    profileModal.classList.remove('hidden');
  } catch (error) {
    showToast(error.message, 'error');
  }
});

closeProfileBtn.addEventListener('click', () => {
  profileModal.classList.add('hidden');
});

cancelProfileBtn.addEventListener('click', (e) => {
  e.preventDefault();
  profileModal.classList.add('hidden');
});

profileForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const newStoreName = document.getElementById('profileStoreName').value.trim();
  const newEmail = document.getElementById('profileEmail').value.trim();

  if (!newStoreName || !newEmail) {
    showToast('Nama toko dan email wajib diisi.', 'error');
    return;
  }

  try {
    const data = await api('/me', {
      method: 'PUT',
      body: JSON.stringify({ storeName: newStoreName, email: newEmail })
    });

    setToken(data.token);
    renderAuthState(true, data.user);
    profileModal.classList.add('hidden');
    showToast('Profil berhasil diperbarui!', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
});

document.getElementById('productForm').addEventListener('submit', async (event) => {
  event.preventDefault();

  const name = document.getElementById('productName').value.trim();
  const sku = document.getElementById('productSku').value.trim();
  const category = document.getElementById('productCategory').value.trim();
  const description = document.getElementById('productDescription').value.trim();
  const initialStock = document.getElementById('productInitialStock').value;
  const price = document.getElementById('productPrice').value;
  const minStock = document.getElementById('productMinStock').value;

  if (!name || !sku) {
    showToast('Nama barang dan SKU wajib diisi.', 'error');
    return;
  }

  const payload = {
    name,
    sku,
    category: category || 'Umum',
    description,
    initialStock: Number(initialStock) || 0,
    price: Number(price) || 0,
    minStock: Number(minStock) || 5
  };

  try {
    await api('/products', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    document.getElementById('productForm').reset();
    document.getElementById('productInitialStock').value = 0;
    document.getElementById('productPrice').value = 0;
    document.getElementById('productMinStock').value = 5;
    showToast('Barang berhasil ditambahkan.', 'success');
    await loadDashboard();
  } catch (error) {
    showToast(error.message, 'error');
  }
});

document.getElementById('transactionForm').addEventListener('submit', async (event) => {
  event.preventDefault();

  const productId = document.getElementById('transactionProduct').value;
  const type = document.getElementById('transactionType').value;
  const quantity = document.getElementById('transactionQty').value;
  const note = document.getElementById('transactionNote').value.trim();

  if (!productId || !type || !quantity) {
    showToast('Pilih barang, jenis, dan jumlah transaksi.', 'error');
    return;
  }

  const payload = {
    productId: Number(productId),
    type,
    quantity: Number(quantity),
    note
  };

  try {
    await api('/transactions', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    document.getElementById('transactionForm').reset();
    document.getElementById('transactionQty').value = 1;
    showToast(`Transaksi barang ${type === 'in' ? 'masuk' : 'keluar'} berhasil dicatat.`, 'success');
    await loadDashboard();
  } catch (error) {
    showToast(error.message, 'error');
  }
});

logoutBtn.addEventListener('click', () => {
  if (confirm('Yakin ingin logout?')) {
    setToken(null);
    renderAuthState(false);
    loginForm.reset();
    registerForm.reset();
    showToast('Anda berhasil logout.', 'success');
  }
});

tabs.forEach((tab) => {
  tab.addEventListener('click', () => switchTab(tab.dataset.target));
});

window.addEventListener('online', () => {
  showToast('Koneksi internet tersedia.', 'success');
});

window.addEventListener('offline', () => {
  showToast('Mode offline - data lokal saja.', 'error');
});

loadUserSession();
