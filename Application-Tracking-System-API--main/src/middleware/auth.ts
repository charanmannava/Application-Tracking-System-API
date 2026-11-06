import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export interface AuthUser {
  id: string;
  role: string;
  company_id?: string | null;
}

export function signToken(user: AuthUser): string {
  const jwtSecret = process.env.JWT_SECRET || 'super_secret_jwt_key';
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      company_id: user.company_id ?? null,
    },
    jwtSecret,
  );
}

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key') as AuthUser;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
