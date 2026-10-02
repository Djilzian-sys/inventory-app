* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: Arial, sans-serif;
  background: linear-gradient(135deg, #f3f8ff, #eef7f0);
  color: #1f2937;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 16px;
}

.hidden {
  display: none !important;
}

.auth-card {
  max-width: 440px;
  margin: 80px auto 0;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.08);
  padding: 24px;
}

.tab-row {
  display: flex;
  gap: 8px;
  background: #eef2ff;
  border-radius: 12px;
  padding: 6px;
  margin-bottom: 20px;
}

.tab {
  flex: 1;
  border: none;
  border-radius: 10px;
  background: transparent;
  padding: 10px 12px;
  font-weight: 700;
  color: #4b5563;
  cursor: pointer;
}

.tab.active {
  background: #fff;
  color: #111827;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.auth-form {
  display: none;
}

.auth-form.active {
  display: block;
}

.auth-form h2 {
  margin-top: 0;
  margin-bottom: 16px;
}

label {
  display: block;
  margin-bottom: 14px;
  font-weight: 600;
  color: #374151;
}

input,
select,
textarea,
button {
  width: 100%;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid #d1d5db;
  font-size: 14px;
  margin-top: 6px;
}

input:focus,
select:focus,
textarea:focus {
  outline: 2px solid rgba(59, 130, 246, 0.2);
  border-color: #3b82f6;
}

button {
  cursor: pointer;
  border: none;
  background: #2563eb;
  color: white;
  font-weight: 700;
}

button:hover {
  opacity: 0.96;
}

.secondary-btn {
  background: #111827;
  width: auto;
  padding: 10px 18px;
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  gap: 12px;
}

.topbar h1 {
  margin: 0;
}

.topbar p {
  margin: 6px 0 0;
  color: #4b5563;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 14px;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.04);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-card span {
  color: #6b7280;
  font-size: 14px;
}

.stat-card strong {
  font-size: 28px;
}

.panel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.panel,
.table-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.04);
  padding: 20px;
}

.panel h3,
.table-card h3 {
  margin-top: 0;
}

.data-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;
}

th,
td {
  text-align: left;
  padding: 10px 8px;
  border-bottom: 1px solid #e5e7eb;
  font-size: 14px;
  vertical-align: top;
}

th {
  color: #374151;
  background: #f9fafb;
}

.status-badge {
  display: inline-block;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.status-in {
  background: #dcfce7;
  color: #166534;
}

.status-out {
  background: #fee2e2;
  color: #991b1b;
}

.delete-btn {
  background: #ef4444;
  width: auto;
  padding: 8px 12px;
  font-size: 12px;
}

.toast {
  position: fixed;
  right: 20px;
  bottom: 20px;
  background: #111827;
  color: #fff;
  padding: 12px 18px;
  border-radius: 12px;
  box-shadow: 0 10px 18px rgba(0, 0, 0, 0.1);
  opacity: 0;
  transform: translateY(16px);
  transition: opacity 0.22s ease, transform 0.22s ease;
  pointer-events: none;
}

.toast.show {
  opacity: 1;
  transform: translateY(0);
}

@media (max-width: 768px) {
  .data-section {
    grid-template-columns: 1fr;
  }

  .topbar {
    flex-direction: column;
    align-items: flex-start;
  }
}

