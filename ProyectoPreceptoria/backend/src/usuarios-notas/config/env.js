const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'clave_secreta_fallback_desarrollo_academico_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
  DB_HOST: process.env.DB_HOST || '127.0.0.1',
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_NAME: process.env.DB_NAME || 'clementina',
  DB_PORT: Number(process.env.DB_PORT) || 3306,
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*'
};
