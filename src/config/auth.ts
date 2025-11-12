import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const SECRET = process.env.JWT_SECRET!;
const TTL = process.env.JWT_TTL || '7d';

export function signAccess(userId: string) {
  return jwt.sign({ sub: userId }, SECRET, { expiresIn: TTL });
}
export function verifyAccess(token: string) {
  return jwt.verify(token, SECRET) as { sub: string; iat: number; exp: number };
}
export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}
export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}
