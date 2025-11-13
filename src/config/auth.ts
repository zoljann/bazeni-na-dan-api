import jwt, { type SignOptions, type JwtPayload } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { ENV } from './env';

if (!ENV.JWT_SECRET) throw new Error('Missing JWT_SECRET');

const EXPIRES_IN = /^\d+$/.test(ENV.JWT_TTL)
  ? Number(ENV.JWT_TTL)
  : (ENV.JWT_TTL as SignOptions['expiresIn']);

export function signAccess(userId: string) {
  return jwt.sign({ sub: userId }, ENV.JWT_SECRET, { expiresIn: EXPIRES_IN });
}
export function verifyAccess(token: string) {
  return jwt.verify(token, ENV.JWT_SECRET);
}
export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}
export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}
