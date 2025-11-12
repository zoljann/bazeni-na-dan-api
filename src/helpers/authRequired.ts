import { Request, Response, NextFunction } from 'express';
import { ENV } from '../config/env';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export const authRequired = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!token) {
    return res.status(401).json({ code: 'AUTH_REQUIRED', message: 'Auth required' });
  }

  try {
    const payload = jwt.verify(token, ENV.JWT_SECRET) as { sub: string };
    (req as any).userId = payload.sub;
    next();
  } catch (e: any) {
    const isExpired = e?.name === 'TokenExpiredError';
    return res
      .status(401)
      .json({ code: isExpired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID', message: 'Unauthorized' });
  }
};

export const adminSecretRequired = (req: Request, res: Response, next: NextFunction) => {
  const provided = req.header('x-admin-secret') || '';
  const expected = ENV.ADMIN_SECRET || '';
  if (!expected) return res.status(500).json({ message: 'Server misconfigured' });

  // constant-time compare
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!ok) return res.status(401).json({ message: 'Unauthorized' });

  next();
};
