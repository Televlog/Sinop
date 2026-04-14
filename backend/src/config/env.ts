import dotenv from 'dotenv';

dotenv.config();

const required = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
};

const optional = (key: string, fallback: string): string =>
  process.env[key] ?? fallback;

export const env = {
  NODE_ENV: optional('NODE_ENV', 'development'),
  PORT: parseInt(optional('PORT', '5000'), 10),
  CLIENT_URL: optional('CLIENT_URL', 'http://localhost:3000'),
  MOBILE_URL: optional('MOBILE_URL', 'exp://localhost:8081'),

  DATABASE_URL: required('DATABASE_URL'),

  JWT_SECRET: required('JWT_SECRET'),
  JWT_EXPIRES_IN: optional('JWT_EXPIRES_IN', '15m'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),
  JWT_REFRESH_EXPIRES_IN: optional('JWT_REFRESH_EXPIRES_IN', '7d'),

  GOOGLE_CLIENT_ID: optional('GOOGLE_CLIENT_ID', ''),
  GOOGLE_CLIENT_SECRET: optional('GOOGLE_CLIENT_SECRET', ''),
  GOOGLE_CALLBACK_URL: optional('GOOGLE_CALLBACK_URL', 'http://localhost:5000/api/auth/google/callback'),

  PLAID_CLIENT_ID: optional('PLAID_CLIENT_ID', ''),
  PLAID_SECRET: optional('PLAID_SECRET', ''),
  PLAID_ENV: optional('PLAID_ENV', 'sandbox') as 'sandbox' | 'development' | 'production',

  OPENAI_API_KEY: optional('OPENAI_API_KEY', ''),

  SMTP_HOST: optional('SMTP_HOST', 'smtp.gmail.com'),
  SMTP_PORT: parseInt(optional('SMTP_PORT', '587'), 10),
  SMTP_USER: optional('SMTP_USER', ''),
  SMTP_PASS: optional('SMTP_PASS', ''),
  EMAIL_FROM: optional('EMAIL_FROM', 'Sinop App <noreply@sinopapp.com>'),

  CLOUDINARY_CLOUD_NAME: optional('CLOUDINARY_CLOUD_NAME', ''),
  CLOUDINARY_API_KEY: optional('CLOUDINARY_API_KEY', ''),
  CLOUDINARY_API_SECRET: optional('CLOUDINARY_API_SECRET', ''),

  FIREBASE_PROJECT_ID: optional('FIREBASE_PROJECT_ID', ''),
  FIREBASE_PRIVATE_KEY: optional('FIREBASE_PRIVATE_KEY', ''),
  FIREBASE_CLIENT_EMAIL: optional('FIREBASE_CLIENT_EMAIL', ''),

  ENCRYPTION_KEY: optional('ENCRYPTION_KEY', 'default_32_char_key_change_me!!'),

  isProd: () => process.env.NODE_ENV === 'production',
  isDev: () => process.env.NODE_ENV === 'development',
};
