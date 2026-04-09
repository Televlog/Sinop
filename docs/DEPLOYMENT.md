# Deployment Guide

---

## 1. Backend — AWS / Railway / Render

### Option A: Railway (Easiest)

1. Push code to GitHub
2. Create project at railway.app
3. Add a PostgreSQL service
4. Add your backend as a service, set root to `/backend`
5. Set environment variables (copy from `.env.example`)
6. Set start command: `npm run build && npx prisma migrate deploy && npm start`

### Option B: AWS EC2

```bash
# On EC2 (Ubuntu 22.04)
sudo apt update && sudo apt install -y nodejs npm postgresql

# Clone repo
git clone https://github.com/youruser/fintrack.git
cd fintrack/backend

npm install
npm run build
npx prisma migrate deploy

# Run with PM2
npm install -g pm2
pm2 start dist/app.js --name fintrack-api
pm2 startup && pm2 save
```

Set up Nginx as reverse proxy:
```nginx
server {
    listen 80;
    server_name api.yourapp.com;
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo certbot --nginx -d api.yourapp.com  # SSL
```

### Option C: Docker

```dockerfile
# backend/Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build && npx prisma generate
EXPOSE 5000
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: fintrack
      POSTGRES_USER: fintrack
      POSTGRES_PASSWORD: secret
    volumes:
      - pgdata:/var/lib/postgresql/data

  api:
    build: ./backend
    ports:
      - "5000:5000"
    depends_on:
      - db
    environment:
      DATABASE_URL: postgresql://fintrack:secret@db:5432/fintrack
      # ... add all other env vars

volumes:
  pgdata:
```

```bash
docker-compose up -d
docker-compose exec api npx prisma migrate deploy
```

---

## 2. Web Frontend — Vercel (Recommended)

```bash
cd frontend
npm install -g vercel
vercel
```

Or connect GitHub repo to vercel.com.

**Environment variables in Vercel:**
```
NEXT_PUBLIC_API_URL=https://api.yourapp.com/api
```

### Build settings:
- Framework: Next.js
- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `.next`

---

## 3. Mobile — EAS Build (Expo)

### Setup
```bash
npm install -g eas-cli
cd mobile
eas login
eas build:configure
```

### Build Android APK / AAB
```bash
eas build --platform android --profile preview    # APK for testing
eas build --platform android --profile production # AAB for Play Store
```

### Build iOS IPA
```bash
eas build --platform ios --profile production
```

### Submit to stores
```bash
eas submit --platform android
eas submit --platform ios
```

### eas.json (already configured)
```json
{
  "cli": { "version": ">= 10.0.0" },
  "build": {
    "preview": { "android": { "buildType": "apk" } },
    "production": {}
  },
  "submit": {
    "production": {}
  }
}
```

---

## 4. Database — Production PostgreSQL

### AWS RDS
1. Create RDS PostgreSQL 15 instance
2. Set VPC security group to allow EC2 access on port 5432
3. Use connection string: `postgresql://user:pass@rds-endpoint:5432/fintrack`

### Supabase (Free tier available)
1. Create project at supabase.com
2. Get connection string from Project Settings → Database
3. Set `DATABASE_URL` in backend env

### Run Migrations
```bash
cd backend
DATABASE_URL=your_prod_url npx prisma migrate deploy
```

---

## 5. Environment Checklist

### Backend Production
```
NODE_ENV=production
PORT=5000
CLIENT_URL=https://app.yourapp.com
DATABASE_URL=postgresql://...
JWT_SECRET=<generate: openssl rand -base64 32>
JWT_REFRESH_SECRET=<generate: openssl rand -base64 32>
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=https://api.yourapp.com/api/auth/google/callback
PLAID_CLIENT_ID=...
PLAID_SECRET=...
PLAID_ENV=production
OPENAI_API_KEY=...
SMTP_HOST=smtp.gmail.com
SMTP_USER=...
SMTP_PASS=...
ENCRYPTION_KEY=<generate: openssl rand -base64 24>
```

---

## 6. Google OAuth Setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create project → Enable Google OAuth API
3. Create OAuth 2.0 credentials
4. Add authorized redirect URIs:
   - `http://localhost:5000/api/auth/google/callback` (dev)
   - `https://api.yourapp.com/api/auth/google/callback` (prod)
5. Copy Client ID + Secret to env

---

## 7. Plaid Setup

1. Sign up at [plaid.com](https://plaid.com)
2. Create app in Dashboard
3. Copy `PLAID_CLIENT_ID` and `PLAID_SECRET`
4. Start with `PLAID_ENV=sandbox` for testing
5. Apply for Development/Production access when ready

---

## 8. CORS Configuration

Update `backend/src/app.ts` CORS origin for production:
```typescript
origin: ['https://app.yourapp.com', 'exp://...'],
```
