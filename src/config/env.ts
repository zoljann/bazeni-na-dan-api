import 'dotenv/config';

export const ENV = {
  PORT: Number(process.env.PORT ?? 4000),
  MONGO_URI: process.env.MONGO_URI ?? '',
  ADMIN_SECRET: process.env.ADMIN_SECRET ?? '',
  JWT_SECRET: process.env.JWT_SECRET ?? '',
  JWT_TTL: process.env.JWT_TTL ?? '7d',
  IMAGEKIT_PUBLIC_KEY: process.env.IMAGEKIT_PUBLIC_KEY ?? '',
  IMAGEKIT_PRIVATE_KEY: process.env.IMAGEKIT_PRIVATE_KEY ?? '',
  IMAGEKIT_URL_ENDPOINT: process.env.IMAGEKIT_URL_ENDPOINT ?? '',
  SMTP_HOST: process.env.SMTP_HOST ?? 'smtp.gmail.com',
  SMTP_PORT: Number(process.env.SMTP_PORT ?? 587),
  SMTP_USER: process.env.SMTP_USER ?? '',
  SMTP_PASS: process.env.SMTP_PASS ?? '',
  SMTP_FROM: process.env.SMTP_FROM ?? 'Bazeni na dan <no-reply@bazeni-na-dan.com>',
  FRONTEND_URL: process.env.FRONTEND_URL ?? 'https://bazeni-na-dan.com'
} as const;
