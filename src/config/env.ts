import 'dotenv/config';

export const ENV = {
  PORT: Number(process.env.PORT ?? 4000),
  MONGO_URI: process.env.MONGO_URI ?? '',
  ADMIN_SECRET: process.env.ADMIN_SECRET ?? '',
  JWT_SECRET: process.env.JWT_SECRET ?? '',
  JWT_TTL: process.env.JWT_TTL ?? '7d',
  IMAGEKIT_PUBLIC_KEY: process.env.IMAGEKIT_PUBLIC_KEY ?? '',
  IMAGEKIT_PRIVATE_KEY: process.env.IMAGEKIT_PRIVATE_KEY ?? '',
  IMAGEKIT_URL_ENDPOINT: process.env.IMAGEKIT_URL_ENDPOINT ?? ''
} as const;
