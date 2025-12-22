# PharmaDesk 💊

A modern, full-stack Pharmacy Management System built with React and Node.js.

## Features

### Core Features
- 🔐 **Authentication** - JWT-based secure login with email verification
- 👥 **Patient Management** - Complete patient profiles with medical history & timeline
- 🩺 **Doctor Management** - Track prescribing doctors and specializations
- 💊 **Medicine Catalog** - Manage medicines with categories and pricing
- 📦 **Inventory Tracking** - Batch-wise stock with expiry alerts
- 📋 **Prescriptions** - Create and dispense with FIFO stock deduction
- 💰 **Billing & POS** - Invoice generation with PDF download & email receipts
- 📊 **Reports** - Sales, inventory, and expiry analytics with charts

### Advanced Features (Tier 3)
- 🔒 **Two-Factor Authentication** - TOTP-based 2FA with backup codes
- ⏰ **Expiry Alerts** - Automated daily notifications for expiring medicines
- 📧 **Digital Receipts** - Email invoices directly to customers
- 📜 **Patient History Timeline** - Complete prescription & purchase history
- 🛡️ **Granular Permissions** - Role-based access control (Admin/Pharmacist/Doctor/Staff)
- 📱 **Session Management** - View and manage active login sessions
- ⌨️ **Keyboard Shortcuts** - Customizable shortcuts for power users
- 🌙 **Dark/Light Mode** - Toggle between Clinical Blue and Dark themes


## Quick Start

### 1. Clone & Setup Database

```sql
-- Run in MySQL
CREATE DATABASE pharmadesk;
```

### 2. Configure Environment

```bash
# server/.env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=pharmadesk
JWT_SECRET=your_secret_key

# Email Configuration (for receipts & 2FA)
SMTP_EMAIL=your_email@gmail.com
SMTP_PASSWORD=your_app_password
FRONTEND_URL=http://localhost:3000
```

### 3. Install Dependencies

```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 4. Run the Application

```bash
# Terminal 1 - Start Backend
cd server
npm run dev

# Terminal 2 - Start Frontend
cd client
npm run dev
```

### 5. Access the App

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

### Default Login
- Username: `admin`
- Password: `admin123`

## Project Structure

```
Pharmacy/
├── server/                 # Node.js Backend
│   ├── db/                 # Database schema & connection
│   ├── routes/             # API endpoints
│   ├── middleware/         # Auth & permissions
│   ├── services/           # Email, expiry alerts
│   └── index.js
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Route pages
│   │   ├── services/       # API services
│   │   ├── context/        # Auth & Theme
│   │   └── styles/         # CSS
│   └── index.html
└── README.md
```
