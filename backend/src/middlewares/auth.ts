import { Request, Response, NextFunction } from 'express';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { JwtPayload } from '../types/auth';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.get('authorization');
  const [scheme, token] = authHeader?.trim().split(/\s+/, 2) ?? [];

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      success: false,
      message: 'A Bearer access token is required'
    });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ success: false, message: 'Authentication is not configured' });
  }

  try {
    const decoded = jwt.verify(token, secret);
    if (typeof decoded === 'string' || typeof decoded.userId !== 'string' || typeof decoded.email !== 'string') {
      return res.status(403).json({ success: false, message: 'Invalid token payload' });
    }
    req.user = { userId: decoded.userId, email: decoded.email } as JwtPayload;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(403).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    return res.status(403).json({
      success: false,
      message: 'Invalid token'
    });
  }
};