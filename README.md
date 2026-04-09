# FinTrack — Personal Finance & Subscription Tracker

A full-stack personal finance application similar to Rocket Money. Track expenses, manage subscriptions, set budgets, and get AI-powered insights.

---

## Project Structure

```
Budget tracker App/
├── backend/          # Node.js + Express + TypeScript + Prisma API
├── frontend/         # Next.js 14 Web App
├── mobile/           # React Native (Expo) Mobile App
├── docs/             # API docs, DB schema, deployment guides
└── README.md
```

---

## Tech Stack

| Layer       | Technology                                      |
|-------------|--------------------------------------------------|
| Backend     | Node.js, Express, TypeScript, Prisma ORM        |
| Database    | PostgreSQL                                       |
| Auth        | JWT (access + refresh tokens) + Google OAuth    |
| AI          | OpenAI GPT-4o-mini (categorization + insights) |
| Bank Sync   | Plaid API                                        |
| Web         | Next.js 14, Tailwind CSS, React Query, Zustand  |
| Mobile      | React Native, Expo Router, NativeWind           |
| Email       | Nodemailer (SMTP)                               |
| OCR         | Tesseract.js (receipt scanning)                 |
| Real-time   | Socket.IO                                       |
| Jobs        | node-cron (reminders, budget alerts)            |
| Reports     | PDFKit, ExcelJS                                 |

---

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- npm or yarn

### 1. Clone & Install

```bash
# Backend
cd backend
npm install
cp .env.example .env       # fill in your values

# Frontend
cd ../frontend
npm install

# Mobile
cd ../mobile
npm install
```

### 2. Database Setup

```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
npm run db:seed            # optional demo data
```

### 3. Run All Services

```bash
# Terminal 1 – Backend
cd backend && npm run dev

# Terminal 2 – Web Frontend
cd frontend && npm run dev

# Terminal 3 – Mobile
cd mobile && npx expo start
```

- **API:** http://localhost:5000
- **Web:** http://localhost:3000
- **Mobile:** Scan QR code in Expo Go app

---

## Features

### ✅ Authentication
- Email/password with bcrypt hashing
- Google OAuth 2.0
- JWT access tokens (15 min) + refresh tokens (7 days)
- Multi-factor authentication (TOTP / Google Authenticator)
- Email verification & password reset

### ✅ Dashboard
- Monthly income vs expenses
- Net savings & savings rate
- Spending by category (pie/bar charts)
- Recent transactions list
- AI insights panel
- Upcoming subscription billing

### ✅ Expense Tracking
- Manual transaction entry
- AI auto-categorization (OpenAI or rule-based fallback)
- Receipt upload & OCR scanning
- Recurring transaction detection
- Filter by type, category, date, search

### ✅ Bank Integration (Plaid)
- Connect bank/credit accounts
- Auto-sync transactions
- Real balance display
- Multi-account support

### ✅ Subscription Management
- Track all active subscriptions
- Billing cycle detection (monthly, yearly, etc.)
- Upcoming billing alerts
- Cancel tracking with confirmation
- Auto-detect from transaction history

### ✅ Budgeting
- Monthly budgets per category
- Real-time spending progress bars
- Threshold alerts (email + push)
- Savings goals with progress tracking

### ✅ Notifications
- Payment reminders (configurable days ahead)
- Budget overrun alerts
- Goal completion celebrations
- In-app + email notifications

### ✅ Reports & Analytics
- Monthly income vs expense summary
- 6-month spending trends
- Category breakdown (pie chart)
- Daily spending line chart
- Export to PDF or Excel

### ✅ AI Features
- Transaction auto-categorization
- Unusual spending detection
- Savings rate analysis
- Subscription waste detection
- Budget forecast alerts

### ✅ Admin Panel
- User management (view, role change, delete)
- Platform-wide transaction monitoring
- Growth analytics charts
- New user tracking

---

## Environment Variables

Copy `backend/.env.example` → `backend/.env` and fill in:

```
DATABASE_URL          PostgreSQL connection string
JWT_SECRET            32+ char secret
JWT_REFRESH_SECRET    32+ char secret
GOOGLE_CLIENT_ID      Google OAuth client ID
GOOGLE_CLIENT_SECRET  Google OAuth client secret
PLAID_CLIENT_ID       Plaid client ID (sandbox for dev)
PLAID_SECRET          Plaid secret
OPENAI_API_KEY        OpenAI API key (optional, has fallback)
SMTP_USER             Gmail or SMTP email
SMTP_PASS             App password
```

For the web frontend, create `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

For mobile, create `mobile/.env`:
```
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:5000/api
```
> Use your machine's local IP (not `localhost`) for physical devices.
