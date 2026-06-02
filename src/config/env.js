require('dotenv').config();

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 3000,

  // Database
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY:
    process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET,
  DATABASE_URL: process.env.DATABASE_URL,
  CV_STORAGE_BUCKET: process.env.CV_STORAGE_BUCKET || 'cv-files',
  FRONTEND_URL: process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://localhost:3001',

  // AI Model
  AI_MODEL_URL: process.env.AI_MODEL_URL || 'http://localhost:5000',
  AI_API_KEY: process.env.AI_API_KEY,
  AI_SERVICE_1_URL: process.env.AI_SERVICE_1_URL || 'http://localhost:8000',
  AI_SERVICE_2_URL: process.env.AI_SERVICE_2_URL || 'http://localhost:8001',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'neokarir-secret-key',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '24h',

  // Cors
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3001',

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // SMTP Configuration
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: process.env.SMTP_PORT || 587,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
};
