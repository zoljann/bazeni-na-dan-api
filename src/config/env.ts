import 'dotenv/config';

export const ENV = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT ?? 4000),
  API_PREFIX: process.env.API_PREFIX ?? '/api',
  ADMIN_SECRET: process.env.ADMIN_SECRET ?? '',
  JWT_SECRET: process.env.JWT_SECRET ?? '',
} as const;
