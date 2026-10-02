# 🚀 Panduan Deploy ke Render

## Langkah-Langkah Deploy

### 1️⃣ Persiapan Sebelum Deploy

Pastikan file berikut sudah ada di repo:
- ✅ `server.js` - File utama server
- ✅ `db.js` - Database layer
- ✅ `package.json` - Dependencies
- ✅ `render.yaml` - Konfigurasi Render
- ✅ `.env.example` - Template environment
- ✅ `.gitignore` - File yang diabaikan

### 2️⃣ Buka Render Dashboard

1. Buka https://render.com
2. Klik tombol **"Sign up"** atau **"Login"**
3. Pilih **"Continue with GitHub"**
4. Authorize Render ke GitHub Anda

### 3️⃣ Buat Web Service Baru

1. Di dashboard Render, klik **"New +"** di atas
2. Pilih **"Web Service"**
3. Di halaman "Create a new Web Service":
   - Pilih repo: **`inventory-app`**
   - Klik **"Connect"**

### 4️⃣ Konfigurasi Service

Render akan auto-load konfigurasi dari `render.yaml`. Verifikasi:

**Name:** `inventory-app` (atau nama lain)
**Environment:** `Node`
**Branch:** `main`
**Build Command:** `npm install` (auto)
**Start Command:** `npm start` (auto)
**Plan:** Pilih **"Free"** (sudah cukup untuk testing)

### 5️⃣ Tambah Environment Variables (⚠️ PENTING!)

1. Scroll ke bawah, cari bagian **"Environment"**
2. Klik **"Add Environment Variable"**
3. Tambahkan 2 variable:

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `JWT_SECRET` | `your-super-secret-key-12345` |

   ⚠️ **PENTING:** Ganti `your-super-secret-key-12345` dengan string random yang kuat!

4. Klik **"Create Web Service"**

### 6️⃣ Tunggu Deploy Selesai

Render akan:
- ✅ Clone repo dari GitHub
- ✅ Install dependencies (`npm install`)
- ✅ Jalankan server (`npm start`)
- ✅ Assign URL publik (contoh: `https://inventory-app-xxxxx.onrender.com`)

Proses ini biasanya memakan waktu 2-5 menit. Cek **"Events"** di dashboard untuk melihat progress.

### 7️⃣ Test Aplikasi

Setelah status berubah menjadi **"Live"**:

1. Klik URL yang diberikan Render
2. Anda akan melihat halaman login
3. **Username default:** `admin`
4. **Password default:** `admin123`

### 8️⃣ Install sebagai PWA (App di HP)

Setelah app berjalan di Render, Anda bisa menambahkannya ke Home Screen:

**Android (Chrome):**
1. Buka URL app di Chrome
2. Klik menu (⋮) → **"Install app"**
3. Confirm → Done! ✅

**iPhone (Safari):**
1. Buka URL app di Safari
2. Klik Share (↑) → **"Add to Home Screen"**
3. Confirm → Done! ✅

---

## 🔧 Troubleshooting

### Build gagal / Deploy error
- Buka tab **"Logs"** di Render dashboard
- Lihat pesan error
- Paling sering: `npm install` gagal → cek internet & dependencies

### Aplikasi tidak muncul
- Tunggu 1-2 menit lagi (server masih starting)
- Refresh halaman
- Buka **"Logs"** untuk cek error

### Database tidak terbuat
- Render memiliki persistent storage di path `/data/`
- SQLite akan otomatis membuat database saat pertama kali
- Tidak perlu setup manual

### Lupa JWT_SECRET
- Buka Render dashboard → Settings
- Cari "Environment"
- Edit `JWT_SECRET` jika perlu

---

## 📌 Catatan Penting

✅ **Aplikasi Anda:**
- Menggunakan SQLite (embedded, tidak perlu DB terpisah)
- Punya HTTPS otomatis (Render provide)
- Sudah PWA-ready (bisa install di HP)
- Sudah ada auth sistem (login/register)
- Sudah ada API backend lengkap

⚠️ **Keterbatasan Free Plan Render:**
- Server bisa "spin down" jika tidak dipakai 15 menit
- Loading pertama setelah idle bisa lama
- Untuk production, upgrade ke paid plan

💡 **Next Step (Optional):**
- Custom domain: Hubungi Render support
- Backup database: Download dari Render console
- Monitor performance: Lihat di Render dashboard

---

## ✅ Selesai!

Aplikasi Anda sekarang **LIVE** dan bisa diakses dari mana saja! 🎉

URL: https://inventory-app-xxxxx.onrender.com

Nikmati! 🚀
