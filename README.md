const authView = document.getElementById('authView');
const appView = document.getElementById('appView');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const tabs = document.querySelectorAll('.tab');
const toast = document.getElementById('toast');
const welcomeText = document.getElementById('welcomeText');
const logoutBtn = document.getElementById('logoutBtn');

const totalProductsEl = document.getElementById('totalProducts');
const totalStockEl = document.getElementById('totalStock');
const incomingQtyEl = document.getElementById('incomingQty');
const outgoingQtyEl = document.getElementById('outgoingQty');
const productTableBody = document.getElementById('productTableBody');
const transactionTableBody = document.getElementById('transactionTableBody');
const transactionProductSelect = document.getElementById('transactionProduct');

const tokenKey = 'inventoryAuthToken';

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
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
    welcomeText.textContent = `Selamat datang, ${user.username}`;
  } else {
    authView.classList.remove('hidden');
    appView.classList.add('hidden');
    welcomeText.textContent = '';
  }
}

async function loadDashboard() {
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
    productTableBody.innerHTML = '<tr><td colspan="5">Belum ada barang.</td></tr>';
    return;
  }

  productTableBody.innerHTML = products
    .map(
      (product) => `
        <tr>
          <td>${product.name}</td>
          <td>${product.sku}</td>
          <td>${product.category || '-'}</td>
          <td>${product.stock}</td>
          <td>
            <button class="delete-btn" data-id="${product.id}">Hapus</button>
          </td>
        </tr>
      `
    )
    .join('');

  productTableBody.querySelectorAll('.delete-btn').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        await api(`/products/${button.dataset.id}`, { method: 'DELETE' });
        showToast('Barang berhasil dihapus.');
        await loadDashboard();
      } catch (error) {
        showToast(error.message);
      }
    });
  });
}

function renderTransactionsTable(transactions) {
  if (!transactions.length) {
    transactionTableBody.innerHTML = '<tr><td colspan="5">Belum ada transaksi.</td></tr>';
    return;
  }

  transactionTableBody.innerHTML = transactions
    .map(
      (tx) => `
        <tr>
          <td>${tx.product_name}</td>
          <td>
            <span class="status-badge ${tx.type === 'in' ? 'status-in' : 'status-out'}">
              ${tx.type === 'in' ? 'Masuk' : 'Keluar'}
            </span>
          </td>
          <td>${tx.quantity}</td>
          <td>${tx.note || '-'}</td>
          <td>${new Date(tx.created_at).toLocaleString('id-ID')}</td>
        </tr>
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
    showToast('Sesi berakhir, silakan login ulang.');
  }
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const data = await api('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });

    setToken(data.token);
    renderAuthState(true, data.user);
    await loadDashboard();
    loginForm.reset();
  } catch (error) {
    showToast(error.message);
  }
});

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const username = document.getElementById('registerUsername').value;
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;

  try {
    const data = await api('/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password })
    });

    setToken(data.token);
    renderAuthState(true, data.user);
    await loadDashboard();
    registerForm.reset();
    switchTab('loginForm');
  } catch (error) {
    showToast(error.message);
  }
});

document.getElementById('productForm').addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = {
    name: document.getElementById('productName').value,
    sku: document.getElementById('productSku').value,
    category: document.getElementById('productCategory').value,
    description: document.getElementById('productDescription').value,
    initialStock: Number(document.getElementById('productInitialStock').value || 0)
  };

  try {
    await api('/products', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    document.getElementById('productForm').reset();
    document.getElementById('productInitialStock').value = 0;
    showToast('Barang berhasil ditambahkan.');
    await loadDashboard();
  } catch (error) {
    showToast(error.message);
  }
});

document.getElementById('transactionForm').addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = {
    productId: Number(document.getElementById('transactionProduct').value),
    type: document.getElementById('transactionType').value,
    quantity: Number(document.getElementById('transactionQty').value),
    note: document.getElementById('transactionNote').value || ''
  };

  try {
    await api('/transactions', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    document.getElementById('transactionForm').reset();
    document.getElementById('transactionQty').value = 1;
    showToast('Transaksi berhasil disimpan.');
    await loadDashboard();
  } catch (error) {
    showToast(error.message);
  }
});

logoutBtn.addEventListener('click', () => {
  setToken(null);
  renderAuthState(false);
  showToast('Anda berhasil logout.');
});

tabs.forEach((tab) => {
  tab.addEventListener('click', () => switchTab(tab.dataset.target));
});

loadUserSession();
