import 'dotenv/config';

export const ENV = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT ?? 4000),
  MONGO_URI: process.env.MONGO_URI ?? '',
  ADMIN_SECRET: process.env.ADMIN_SECRET ?? '',
  JWT_SECRET: process.env.JWT_SECRET ?? '',
  JWT_TTL: process.env.JWT_TTL ?? '7d'
} as const;
