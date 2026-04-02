<div align="center">

<!-- ═══════════════ HEADER BANNER ═══════════════ -->

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20,24&height=240&section=header&text=%F0%9F%92%8A%20PharmaDesk&fontSize=68&fontColor=ffffff&fontAlignY=40&desc=The%20Modern%20Pharmacy%20Management%20System&descAlignY=62&descSize=21&animation=fadeIn" width="100%" />

<!-- Animated feature cycling SVG -->
<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=16&duration=2800&pause=800&color=00E5CC&center=true&vCenter=true&width=620&height=40&lines=Patient+Management+%F0%9F%8F%A5+%7C+Doctor+Directory+%F0%9F%A9%BA;Inventory+%26+Expiry+Tracking+%F0%9F%93%A6;Billing+%26+PDF+Invoices+%F0%9F%92%B0;TOTP+Two-Factor+Auth+%F0%9F%94%90;Live+Analytics+%26+Reports+%F0%9F%93%8A;Role-Based+Access+Control+%F0%9F%9B%A1%EF%B8%8F" alt="Features" />

<br/>

<!-- Status badges -->
<img src="https://img.shields.io/badge/Version-1.0-FF4757?style=for-the-badge&logo=github&logoColor=white&labelColor=C0392B" />&nbsp;
<img src="https://img.shields.io/badge/Status-Active-00C9A7?style=for-the-badge&logo=checkmarx&logoColor=white&labelColor=009688" />&nbsp;
<img src="https://img.shields.io/badge/License-MIT-FFC312?style=for-the-badge&logo=opensourceinitiative&logoColor=black&labelColor=F39C12" />&nbsp;
<img src="https://img.shields.io/badge/2FA-TOTP%20Enabled-BE52F2?style=for-the-badge&logo=authy&logoColor=white&labelColor=8E44AD" />

<br/><br/>

<!-- Tech stack — for-the-badge with logos -->
<img src="https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />&nbsp;
<img src="https://img.shields.io/badge/Node.js_20-1b1b1b?style=for-the-badge&logo=node.js&logoColor=3C873A" />&nbsp;
<img src="https://img.shields.io/badge/MySQL_8-00618A?style=for-the-badge&logo=mysql&logoColor=white" />&nbsp;
<img src="https://img.shields.io/badge/Express_4-404D59?style=for-the-badge&logo=express&logoColor=white" />&nbsp;
<img src="https://img.shields.io/badge/Vite_5-1e1e2e?style=for-the-badge&logo=vite&logoColor=646CFF" />&nbsp;
<img src="https://img.shields.io/badge/Cloudinary-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white" />

<br/><br/>

<!-- Module pills -->
<img src="https://img.shields.io/badge/🏥_Patients-Management-FF6B81?style=flat-square&labelColor=C0392B" />&nbsp;
<img src="https://img.shields.io/badge/💊_Medicines-Catalog-FFA502?style=flat-square&labelColor=D35400" />&nbsp;
<img src="https://img.shields.io/badge/📦_Inventory-Tracking-1E90FF?style=flat-square&labelColor=2980B9" />&nbsp;
<img src="https://img.shields.io/badge/📋_Prescriptions-Dispatch-2ED573?style=flat-square&labelColor=27AE60" />&nbsp;
<img src="https://img.shields.io/badge/💰_Billing-POS-A29BFE?style=flat-square&labelColor=6C5CE7" />&nbsp;
<img src="https://img.shields.io/badge/📊_Analytics-Live-00CEC9?style=flat-square&labelColor=00897B" />

<br/><br/>

> 💡 **Streamline your pharmacy operations** — from inventory and prescriptions to billing and analytics, all in one beautiful, secure dashboard.

</div>

<br/>

---

## ✨ Feature Highlights

<table>
<tr>
<td width="50%">

### 🏥 Clinical Workflow
- **Patient Management** — Profiles, timelines, blood groups, allergies
- **Doctor Directory** — Specializations, license tracking, affiliations
- **Prescriptions** — Create, dispense, and track Rx with one click
- **Billing & Invoicing** — POS-style sales, PDF invoices, email receipts

</td>
<td width="50%">

### 📦 Inventory Intelligence
- **Stock Batches** — Track expiry dates, batch numbers, quantities
- **Low-Stock Alerts** — Automated reorder level notifications
- **Expiry Warnings** — Proactive alerts before medicines expire
- **Supplier Management** — Full supplier database with contact info

</td>
</tr>
<tr>
<td width="50%">

### 📊 Analytics & Reports
- **Live Dashboard** — Revenue charts, top medicines, KPI cards
- **Sales Analysis** — Date-range reports with visual charts
- **Inventory Reports** — Stock health, expiry analysis
- **Audit Logs** — Complete user activity trail for compliance

</td>
<td width="50%">

### 🔐 Security First
- **JWT Authentication** — Stateless, token-based auth
- **TOTP Two-Factor Auth** — Google Authenticator + backup codes
- **Role-Based Access** — Admin / Pharmacist / Doctor / Staff
- **Email Verification** — OTP-verified account & email changes
- **Session Management** — View & revoke active sessions per device

</td>
</tr>
</table>

---

## 🖥️ Interface

| | Dark Mode | Light Mode |
|-|-----------|------------|
| **Palette** | Teal on charcoal | Clinical blue on white |
| **Best for** | Night shifts | Bright pharmacies |

**Key UX features**
- ⌨️ **Command Palette** (`Ctrl+K`) — jump anywhere instantly
- 🌙 **Dark / Light** theme toggle — persistent per user
- 🔍 **Global search** — patients, medicines, doctors in one box
- 📄 **Sortable, paginated tables** — column sorting + per-page control on every table
- 🔔 **Real-time toast** notifications
- 🖼️ **Cloudinary avatars** — profile pictures stored in the cloud

---

## 🗂️ Project Structure

```
pharmadesk/
├── client/                    # React + Vite frontend
│   └── src/
│       ├── components/        # Reusable UI (Toast, Modal, Charts, Skeleton…)
│       ├── context/           # Auth, Theme, Sidebar, Shortcuts
│       ├── pages/             # Full-page route components
│       ├── services/          # Axios API layer
│       └── utils/             # generateInvoice, useSortPaginate…
└── server/                    # Node.js + Express backend
    ├── db/                    # MySQL schema & migration scripts
    ├── middleware/             # auth, auditLog, permissions
    ├── routes/                # REST API route handlers
    └── services/              # email, expiryAlerts
```

---

## 🚀 Getting Started

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | ≥ 18 |
| MySQL | ≥ 8.0 |
| npm | ≥ 9 |

### 1 · Clone & Install

```bash
git clone https://github.com/your-username/pharmadesk.git
cd pharmadesk

# Backend
cd server && npm install

# Frontend
cd ../client && npm install
```

### 2 · Configure Environment

```bash
cp server/.env.example server/.env
# Then edit server/.env with your values
```

```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=pharmadesk

# Auth
JWT_SECRET=your_super_long_random_secret

# Email (for OTP verification & receipts)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password

# Cloudinary (for profile pictures)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 3 · Initialize Database

```bash
# Create the database first
mysql -u root -p -e "CREATE DATABASE pharmadesk;"

# Run schema
mysql -u root -p pharmadesk < server/db/schema.sql

# Seed initial admin account
cd server && node create-admin.js
```

### 4 · Start the App

```bash
# Terminal 1 — Backend (port 5000)
cd server && npm run dev

# Terminal 2 — Frontend (port 5173)
cd client && npm run dev
```

Open **http://localhost:5173** — admin credentials are printed by `create-admin.js`.

---

## 🔑 Roles & Permissions

| Feature | Admin | Pharmacist | Doctor | Staff |
|---------|:-----:|:----------:|:------:|:-----:|
| User Management | ✅ | ❌ | ❌ | ❌ |
| Billing & Sales | ✅ | ✅ | ❌ | ✅ |
| Prescriptions | ✅ | ✅ | ✅ | ✅ |
| Inventory | ✅ | ✅ | ❌ | ✅ |
| Audit Logs | ✅ | ❌ | ❌ | ❌ |
| Reports | ✅ | ✅ | ❌ | ❌ |

---

## 🔒 Security Architecture

| Feature | Implementation |
|---------|----------------|
| Passwords | bcrypt (cost 10) |
| Sessions | JWT + DB session table |
| 2FA | TOTP (otplib) + 8 backup codes |
| Email OTPs | 6-digit, 10-min expiry, single-use |
| Email change | Password + OTP double verification |
| Audit trail | Every CRUD action logged with user/IP/timestamp |

---

## 🛠️ Tech Stack

**Frontend**
- [React 18](https://react.dev) + [Vite 5](https://vitejs.dev)
- [Lucide React](https://lucide.dev) icons
- [Recharts](https://recharts.org) for analytics charts
- [jsPDF](https://github.com/parallax/jsPDF) for invoice generation

**Backend**
- [Express 4](https://expressjs.com) REST API
- [MySQL 2](https://github.com/sidorares/node-mysql2) with connection pooling
- [bcryptjs](https://github.com/dcodeIO/bcrypt.js) password hashing
- [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) JWT auth
- [otplib](https://github.com/yeojz/otplib) TOTP 2FA
- [Nodemailer](https://nodemailer.com) email delivery
- [Cloudinary](https://cloudinary.com) image hosting

---

## 📜 Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Login + 2FA check |
| `POST` | `/api/auth/register` | Register with email verification |
| `POST` | `/api/auth/forgot-password` | Send password reset OTP |
| `PUT` | `/api/auth/change-password` | Change password (authenticated) |
| `POST` | `/api/auth/request-email-change` | Send OTP to new email |
| `POST` | `/api/2fa/setup` | Generate QR code for TOTP |
| `POST` | `/api/2fa/disable` | Disable 2FA (requires password) |
| `POST` | `/api/upload/avatar` | Upload profile picture to Cloudinary |
| `GET` | `/api/patients` | List patients (search, pagination) |
| `GET` | `/api/inventory/overview` | Stock overview + alerts |
| `POST` | `/api/billing` | Create sale / invoice |
| `GET` | `/api/reports/dashboard` | Dashboard KPIs |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

<!-- ═══════════════ FOOTER BANNER ═══════════════ -->

<div align="center">

<br/>

<!-- Module pills row 1 -->
<img src="https://img.shields.io/badge/🏥_Patients-Management-FF6B81?style=for-the-badge&labelColor=C0392B" />&nbsp;
<img src="https://img.shields.io/badge/💊_Medicines-Catalog-FFA502?style=for-the-badge&labelColor=D35400" />&nbsp;
<img src="https://img.shields.io/badge/📦_Inventory-Tracking-1E90FF?style=for-the-badge&labelColor=2980B9" />

<br/><br/>

<!-- Module pills row 2 -->
<img src="https://img.shields.io/badge/📋_Prescriptions-Dispatch-2ED573?style=for-the-badge&labelColor=27AE60" />&nbsp;
<img src="https://img.shields.io/badge/💰_Billing-POS-A29BFE?style=for-the-badge&labelColor=6C5CE7" />&nbsp;
<img src="https://img.shields.io/badge/📊_Analytics-Dashboard-00CEC9?style=for-the-badge&labelColor=00897B" />

<br/><br/>

<!-- Tech stack row -->
<img src="https://img.shields.io/badge/Made%20with-React-61DAFB?style=flat-square&logo=react&logoColor=black" />&nbsp;
<img src="https://img.shields.io/badge/Powered%20by-Node.js-3C873A?style=flat-square&logo=node.js&logoColor=white" />&nbsp;
<img src="https://img.shields.io/badge/DB-MySQL-4479A1?style=flat-square&logo=mysql&logoColor=white" />&nbsp;
<img src="https://img.shields.io/badge/Media-Cloudinary-3448C5?style=flat-square&logo=cloudinary&logoColor=white" />&nbsp;
<img src="https://img.shields.io/badge/Bundler-Vite-646CFF?style=flat-square&logo=vite&logoColor=FFD62E" />

<br/><br/>

<!-- Action badges -->
<a href="https://github.com/your-username/pharmadesk/issues">
  <img src="https://img.shields.io/badge/🐛_Report_Bug-FF4757?style=for-the-badge&labelColor=c0392b" />
</a>&nbsp;
<a href="https://github.com/your-username/pharmadesk/discussions">
  <img src="https://img.shields.io/badge/💬_Discussions-FFC312?style=for-the-badge&labelColor=e67e22" />
</a>&nbsp;
<a href="https://github.com/your-username/pharmadesk/fork">
  <img src="https://img.shields.io/badge/🍴_Fork_It-2ED573?style=for-the-badge&labelColor=27AE60" />
</a>&nbsp;
<a href="#">
  <img src="https://img.shields.io/badge/⭐_Star_This_Repo-BE52F2?style=for-the-badge&labelColor=8E44AD" />
</a>

<br/><br/>

</div>

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20,24&height=140&section=footer&text=Because%20your%20patients%20deserve%20efficient%20care.&fontSize=15&fontColor=aaaaaa&fontAlignY=72" width="100%" />
