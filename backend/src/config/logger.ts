import winston from 'winston';
import { env } from './env';

const { combine, timestamp, errors, colorize, simple, json } = winston.format;

export const logger = winston.createLogger({
  level: env.isDev() ? 'debug' : 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    env.isDev() ? combine(colorize(), simple()) : json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});
