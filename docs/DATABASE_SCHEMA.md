# Database Schema

Database: **PostgreSQL 15** — managed via **Prisma ORM**

Schema file: `backend/prisma/schema.prisma`

---

## Entity Relationship Diagram

```
User (1) ──────< Account (N)
User (1) ──────< Transaction (N)
User (1) ──────< Subscription (N)
User (1) ──────< Budget (N)
User (1) ──────< SavingsGoal (N)
User (1) ──────< Notification (N)
User (1) ──────< AIInsight (N)
User (1) ──────< RefreshToken (N)
Account (1) ───< Transaction (N)
```

---

## Tables

### `users`

| Column          | Type      | Description                          |
|-----------------|-----------|--------------------------------------|
| id              | String    | CUID primary key                     |
| email           | String    | Unique, normalized                   |
| name            | String?   | Display name                         |
| passwordHash    | String?   | bcrypt hash (null for OAuth users)   |
| googleId        | String?   | Google OAuth subject ID              |
| appleId         | String?   | Apple OAuth subject ID               |
| avatarUrl       | String?   | Profile picture URL                  |
| mfaEnabled      | Boolean   | Is 2FA active?                       |
| mfaSecret       | String?   | TOTP secret (base32 encoded)         |
| role            | Role      | USER \| ADMIN                        |
| currency        | String    | Default "USD"                        |
| timezone        | String    | Default "UTC"                        |
| notifyEmail     | Boolean   | Send email notifications             |
| notifyPush      | Boolean   | Send push notifications              |
| fcmToken        | String?   | Firebase Cloud Messaging token       |
| isVerified      | Boolean   | Email verified flag                  |
| verifyToken     | String?   | Email verification token             |
| resetToken      | String?   | Password reset token (UUID)          |
| resetTokenExp   | DateTime? | Reset token expiry                   |
| createdAt       | DateTime  | Account creation time                |
| updatedAt       | DateTime  | Last update (auto)                   |

---

### `refresh_tokens`

| Column    | Type     | Description                  |
|-----------|----------|------------------------------|
| id        | String   | CUID primary key             |
| userId    | String   | FK → users                   |
| token     | String   | Unique JWT refresh token     |
| expiresAt | DateTime | Token expiry (7 days)        |
| userAgent | String?  | Browser/device user agent    |
| ipAddress | String?  | Client IP at login           |
| createdAt | DateTime | Token issue time             |

---

### `accounts`

| Column           | Type        | Description                      |
|------------------|-------------|----------------------------------|
| id               | String      | CUID primary key                 |
| userId           | String      | FK → users                       |
| plaidAccountId   | String?     | Unique Plaid account ID          |
| plaidItemId      | String?     | Plaid item (bank connection)     |
| accessToken      | String?     | Encrypted Plaid access token     |
| institutionId    | String?     | Plaid institution ID             |
| institutionName  | String      | "Chase", "Bank of America", etc  |
| accountName      | String      | "Checking", "Savings", etc       |
| accountMask      | String?     | Last 4 digits                    |
| accountType      | AccountType | CHECKING/SAVINGS/CREDIT/etc      |
| accountSubtype   | String?     | Plaid subtype                    |
| balance          | Float       | Current balance                  |
| availableBalance | Float?      | Available (credit accounts)      |
| currency         | String      | Default "USD"                    |
| isManual         | Boolean     | Manually added (no Plaid)        |
| lastSynced       | DateTime?   | Last Plaid sync time             |

---

### `transactions`

| Column                    | Type            | Description                     |
|---------------------------|-----------------|----------------------------------|
| id                        | String          | CUID primary key                 |
| userId                    | String          | FK → users                       |
| accountId                 | String?         | FK → accounts (null=manual)      |
| plaidTransactionId        | String?         | Unique Plaid TX ID               |
| amount                    | Float           | Positive=expense, neg=income†    |
| currency                  | String          | ISO currency code                |
| description               | String          | Transaction description/name     |
| merchant                  | String?         | Merchant name                    |
| merchantLogo              | String?         | Merchant logo URL                |
| category                  | String?         | AI/manual category               |
| subcategory               | String?         | Sub-category                     |
| date                      | DateTime        | Transaction date                 |
| type                      | TransactionType | INCOME \| EXPENSE \| TRANSFER   |
| isRecurring               | Boolean         | Detected/marked recurring        |
| recurringGroupId          | String?         | Groups recurring transactions    |
| receiptUrl                | String?         | Uploaded receipt file URL        |
| receiptText               | String?         | OCR-extracted text               |
| notes                     | String?         | User notes                       |
| tags                      | String[]        | User-defined tags                |
| isPending                 | Boolean         | Pending from Plaid               |
| location                  | String?         | City, state                      |
| paymentMethod             | String?         | "Credit Card", "Cash", etc       |
| aiCategorizationConfidence| Float?          | 0.0–1.0 AI confidence score      |

† For Plaid data: positive amounts = expenses, negative = income/credits

---

### `subscriptions`

| Column          | Type               | Description                    |
|-----------------|-------------------|--------------------------------|
| id              | String             | CUID                           |
| userId          | String             | FK → users                     |
| name            | String             | "Netflix", "Spotify", etc      |
| amount          | Float              | Billing amount                 |
| currency        | String             | Currency                       |
| billingCycle    | BillingCycle       | MONTHLY/YEARLY/etc             |
| nextBillingDate | DateTime           | Next charge date               |
| startDate       | DateTime?          | Subscription start             |
| category        | String?            | Category tag                   |
| logoUrl         | String?            | Service logo URL               |
| color           | String?            | UI color hex                   |
| url             | String?            | Service website                |
| status          | SubscriptionStatus | ACTIVE/CANCELLED/PAUSED/TRIAL  |
| cancelledAt     | DateTime?          | When cancelled                 |
| cancellationUrl | String?            | Cancellation link              |
| notes           | String?            | User notes                     |
| reminderDays    | Int                | Days before to send reminder   |
| autoDetected    | Boolean            | Detected from transactions?    |

---

### `budgets`

| Column         | Type    | Description                        |
|----------------|---------|------------------------------------|
| id             | String  | CUID                               |
| userId         | String  | FK → users                         |
| category       | String  | Budget category                    |
| amount         | Float   | Monthly budget limit               |
| spent          | Float   | Cached spent amount (updated live) |
| month          | Int     | 1–12                               |
| year           | Int     | e.g. 2026                          |
| alertThreshold | Float   | Alert at this % (0.8 = 80%)        |
| alertSent      | Boolean | Has alert been sent this month?    |
| color          | String? | UI color                           |
| icon           | String? | Emoji icon                         |
| rollover       | Boolean | Roll unused budget to next month   |

**Unique constraint:** `(userId, category, month, year)`

---

### `savings_goals`

| Column        | Type      | Description              |
|---------------|-----------|--------------------------|
| id            | String    | CUID                     |
| userId        | String    | FK → users               |
| name          | String    | "Emergency Fund", etc    |
| targetAmount  | Float     | Goal target              |
| currentAmount | Float     | Progress so far          |
| targetDate    | DateTime? | Optional deadline        |
| category      | String?   | Category tag             |
| icon          | String?   | Emoji icon               |
| color         | String?   | UI color                 |
| status        | GoalStatus| ACTIVE/COMPLETED/CANCELLED|

---

### `notifications`

| Column    | Type             | Description             |
|-----------|------------------|-------------------------|
| id        | String           | CUID                    |
| userId    | String           | FK → users              |
| title     | String           | Notification title      |
| message   | String           | Body text               |
| type      | NotificationType | PAYMENT_REMINDER / etc  |
| isRead    | Boolean          | Read flag               |
| metadata  | Json?            | Extra data (amounts etc)|
| actionUrl | String?          | Deep link               |
| createdAt | DateTime         | Creation time           |

**Notification Types:**
`PAYMENT_REMINDER | BUDGET_ALERT | SUSPICIOUS_ACTIVITY | SUBSCRIPTION_RENEWAL | GOAL_MILESTONE | ACCOUNT_SYNC | GENERAL`

---

### `ai_insights`

| Column      | Type           | Description                |
|-------------|----------------|----------------------------|
| id          | String         | CUID                       |
| userId      | String         | FK → users                 |
| type        | InsightType    | SPENDING_PATTERN / etc     |
| title       | String         | Short title                |
| description | String         | Detailed description       |
| data        | Json?          | Raw numbers/context        |
| isRead      | Boolean        | Dismissed by user?         |
| severity    | InsightSeverity| INFO/WARNING/CRITICAL/POSITIVE|
| expiresAt   | DateTime?      | Auto-expire old insights   |

---

## Enums

```
Role:               USER | ADMIN
AccountType:        CHECKING | SAVINGS | CREDIT | INVESTMENT | LOAN | OTHER
TransactionType:    INCOME | EXPENSE | TRANSFER
BillingCycle:       DAILY | WEEKLY | BIWEEKLY | MONTHLY | QUARTERLY | SEMIANNUAL | YEARLY
SubscriptionStatus: ACTIVE | CANCELLED | PAUSED | TRIAL
GoalStatus:         ACTIVE | COMPLETED | CANCELLED
NotificationType:   PAYMENT_REMINDER | BUDGET_ALERT | SUSPICIOUS_ACTIVITY |
                    SUBSCRIPTION_RENEWAL | GOAL_MILESTONE | ACCOUNT_SYNC | GENERAL
InsightType:        SPENDING_PATTERN | UNUSUAL_EXPENSE | SUBSCRIPTION_WASTE |
                    SAVINGS_OPPORTUNITY | BUDGET_FORECAST | EXPENSE_PREDICTION
InsightSeverity:    INFO | WARNING | CRITICAL | POSITIVE
```

---

## Indexes

| Table         | Index                          |
|---------------|--------------------------------|
| users         | email (unique), googleId, appleId |
| refresh_tokens| userId, token                  |
| accounts      | userId, plaidAccountId (unique)|
| transactions  | userId, date, category, isRecurring |
| subscriptions | userId, nextBillingDate, status|
| budgets       | userId, (userId+category+month+year) unique |
| notifications | userId, isRead                 |
| ai_insights   | userId                         |

---

## Migrations

```bash
# Create a new migration after schema changes
npx prisma migrate dev --name describe_change

# Apply to production
npx prisma migrate deploy

# Reset dev database (drops all data)
npx prisma migrate reset

# View database in browser
npx prisma studio
```
