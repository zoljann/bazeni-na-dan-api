import { Request, Response, NextFunction } from 'express';
import { verifyAccess } from '../lib/auth';

export function authRequired(req: Request, res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  const token = h?.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const payload = verifyAccess(token);
    (req as any).userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}
