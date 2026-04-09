# FinTrack API Documentation

Base URL: `http://localhost:5000/api`

All authenticated endpoints require: `Authorization: Bearer <access_token>`

---

## Authentication `/auth`

### POST /auth/register
Create a new user account.

**Body:**
```json
{ "name": "John Doe", "email": "john@example.com", "password": "SecurePass1" }
```
**Response 201:**
```json
{
  "user": { "id": "...", "name": "John Doe", "email": "...", "role": "USER" },
  "accessToken": "...",
  "refreshToken": "..."
}
```

---

### POST /auth/login
Authenticate and receive tokens.

**Body:**
```json
{ "email": "john@example.com", "password": "SecurePass1", "mfaCode": "123456" }
```
**Response 200:**
```json
{ "user": {...}, "accessToken": "...", "refreshToken": "..." }
```
If MFA is enabled and `mfaCode` not provided:
```json
{ "requireMfa": true, "message": "MFA code required" }
```

---

### POST /auth/refresh
Exchange refresh token for new tokens.

**Body:** `{ "refreshToken": "..." }`

---

### POST /auth/logout
Invalidate refresh token.

**Body:** `{ "refreshToken": "..." }`

---

### POST /auth/forgot-password
Send password reset email.

**Body:** `{ "email": "john@example.com" }`

---

### POST /auth/reset-password
Reset password using token from email.

**Body:** `{ "token": "...", "newPassword": "NewPass123" }`

---

### GET /auth/me *(auth)*
Get current user profile.

### PUT /auth/me *(auth)*
Update profile fields: `name`, `currency`, `timezone`, `notifyEmail`, `notifyPush`, `fcmToken`

### PUT /auth/me/password *(auth)*
**Body:** `{ "currentPassword": "...", "newPassword": "..." }`

---

### MFA Endpoints *(auth)*

| Method | Endpoint          | Description                  |
|--------|-------------------|------------------------------|
| POST   | /auth/mfa/setup   | Generate MFA secret + QR     |
| POST   | /auth/mfa/verify  | Confirm code & enable MFA    |
| POST   | /auth/mfa/disable | Disable MFA (needs password) |

### OAuth
- `GET /auth/google` — Redirect to Google
- `GET /auth/google/callback` — OAuth callback → redirects to frontend with tokens

---

## Transactions `/transactions` *(auth)*

### GET /transactions
List transactions with filtering.

**Query params:**
| Param        | Type    | Description                     |
|--------------|---------|---------------------------------|
| page         | number  | Page number (default: 1)        |
| limit        | number  | Per page, max 100 (default: 20) |
| search       | string  | Search description/merchant     |
| type         | string  | INCOME \| EXPENSE \| TRANSFER   |
| category     | string  | Filter by category              |
| startDate    | string  | ISO date                        |
| endDate      | string  | ISO date                        |
| isRecurring  | boolean | Filter recurring                |
| sortBy       | string  | date \| amount (default: date)  |
| sortOrder    | string  | asc \| desc (default: desc)     |

**Response 200:**
```json
{
  "transactions": [...],
  "pagination": { "page": 1, "limit": 20, "total": 150, "pages": 8 }
}
```

---

### POST /transactions
Create a transaction.

**Body:**
```json
{
  "description": "Grocery shopping",
  "amount": 65.50,
  "date": "2026-04-08",
  "type": "EXPENSE",
  "category": "Groceries",
  "merchant": "Whole Foods",
  "notes": "Weekly shop",
  "isRecurring": false,
  "tags": ["food", "weekly"],
  "paymentMethod": "Credit Card"
}
```

> If `category` is omitted, AI auto-categorizes using OpenAI (falls back to rule-based).

---

### GET /transactions/:id
### PUT /transactions/:id
### DELETE /transactions/:id

### POST /transactions/:id/receipt
Upload receipt image for OCR scanning.

**Form data:** `receipt` (image file, max 10MB)

**Response:**
```json
{
  "receiptUrl": "/uploads/receipts/...",
  "extracted": { "text": "...", "amount": 65.50, "merchant": "Whole Foods", "date": "04/08/2026" }
}
```

---

### GET /transactions/summary
Monthly income/expense summary.

**Query:** `month` (1-12), `year`

**Response:**
```json
{
  "totalIncome": 5000,
  "totalExpenses": 3200,
  "netSavings": 1800,
  "savingsRate": 36,
  "byCategory": [
    { "category": "Groceries", "amount": 450, "percentage": 14.1 }
  ]
}
```

---

### GET /transactions/categories
All unique categories for current user.

### GET /transactions/detect-recurring
Detect recurring transaction patterns from last 90 days.

---

## Subscriptions `/subscriptions` *(auth)*

### GET /subscriptions
**Query:** `status` (ACTIVE | CANCELLED | PAUSED | TRIAL)

**Response:**
```json
{
  "subscriptions": [...],
  "summary": {
    "total": 8,
    "monthlyTotal": 124.50,
    "yearlyTotal": 1494,
    "upcomingIn7Days": 3
  }
}
```

### POST /subscriptions
```json
{
  "name": "Netflix",
  "amount": 15.99,
  "billingCycle": "MONTHLY",
  "nextBillingDate": "2026-05-01",
  "category": "Entertainment",
  "color": "#ef4444",
  "url": "https://netflix.com",
  "reminderDays": 3
}
```

**Billing cycles:** `DAILY | WEEKLY | BIWEEKLY | MONTHLY | QUARTERLY | SEMIANNUAL | YEARLY`

### GET /subscriptions/:id
### PUT /subscriptions/:id
### DELETE /subscriptions/:id

### POST /subscriptions/:id/cancel
Mark subscription as cancelled.

**Body:** `{ "cancellationUrl": "https://..." }` (optional)

### GET /subscriptions/upcoming
**Query:** `days` (default: 30)

Returns subscriptions billing within N days + total cost.

### GET /subscriptions/detect
Auto-detect subscriptions from transaction history.

---

## Budgets `/budgets` *(auth)*

### GET /budgets
**Query:** `month`, `year`

**Response includes** live `spent`, `remaining`, `percentage`, `isOverBudget` per budget.

### POST /budgets
```json
{
  "category": "Food & Dining",
  "amount": 500,
  "month": 4,
  "year": 2026,
  "alertThreshold": 0.8,
  "icon": "🍽️",
  "color": "#f59e0b"
}
```

### PUT /budgets/:id
### DELETE /budgets/:id

---

### Savings Goals

| Method | Endpoint           | Description       |
|--------|--------------------|-------------------|
| GET    | /budgets/goals/all | List all goals    |
| POST   | /budgets/goals     | Create a goal     |
| PUT    | /budgets/goals/:id | Update a goal     |
| DELETE | /budgets/goals/:id | Delete a goal     |

**Create Goal Body:**
```json
{
  "name": "Emergency Fund",
  "targetAmount": 10000,
  "targetDate": "2026-12-31",
  "currentAmount": 2500
}
```

---

## Reports `/reports` *(auth)*

### GET /reports/monthly
**Query:** `month`, `year`

Returns comprehensive monthly report including income, expenses, category breakdown, daily spending, budget comparison.

### GET /reports/trends
**Query:** `months` (default: 6)

Returns month-by-month income/expense data for trend chart.

### GET /reports/insights
Returns unread AI insights for current user.

### POST /reports/insights/generate
Trigger AI analysis and generate new insights.

### GET /reports/export/pdf
**Query:** `month`, `year`

Returns PDF blob (application/pdf).

### GET /reports/export/excel
Returns Excel blob (.xlsx).

### GET /reports/notifications
**Query:** `unreadOnly=true`

### PUT /reports/notifications/:id/read
Mark notification(s) as read. Use `id=all` to mark all read.

---

## Plaid (Bank Integration) `/plaid` *(auth)*

### POST /plaid/link-token
Get a Plaid Link token to open the bank connection UI.

### POST /plaid/exchange-token
Exchange public token after user connects bank.

**Body:** `{ "publicToken": "...", "institutionId": "...", "institutionName": "Chase" }`

### POST /plaid/sync
Sync recent transactions from a linked account.

**Body:** `{ "accountId": "..." }`

### GET /plaid/accounts
List all connected bank accounts.

### DELETE /plaid/accounts/:id
Disconnect a bank account.

---

## Admin `/admin` *(auth + ADMIN role)*

### GET /admin/dashboard
Platform stats + recent users.

### GET /admin/analytics
6-month growth data (new users, transactions).

### GET /admin/users
List all users. **Query:** `page`, `limit`, `search`, `role`

### GET /admin/users/:id
Detailed user info.

### PUT /admin/users/:id/role
**Body:** `{ "role": "ADMIN" | "USER" }`

### DELETE /admin/users/:id
Hard delete user and all their data.

### GET /admin/transactions
All platform transactions. **Query:** `page`, `limit`, `userId`

---

## Error Responses

All errors follow:
```json
{ "message": "Human-readable error", "code": "OPTIONAL_CODE" }
```

| Status | Meaning                  |
|--------|--------------------------|
| 400    | Validation / bad request |
| 401    | Unauthenticated          |
| 403    | Forbidden (wrong role)   |
| 404    | Not found                |
| 409    | Conflict (duplicate)     |
| 429    | Rate limit exceeded      |
| 500    | Internal server error    |

---

## Rate Limits

| Endpoint Group        | Limit             |
|-----------------------|-------------------|
| Global                | 200 req / 15 min  |
| Auth (login/register) | 10 req / 15 min   |
| API endpoints         | 60 req / minute   |
