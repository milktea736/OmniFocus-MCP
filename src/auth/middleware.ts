import type { Request, Response, NextFunction } from 'express';
import { sessionManager } from './session-manager.js';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  
  // Check session token (for SSE connections)
  const sessionToken = req.headers['x-session-token'] as string;
  if (sessionToken) {
    const session = sessionManager.getSession(sessionToken);
    if (session) {
      req.user = session.user;
      return next();
    }
  }
  
  res.status(401).json({ error: 'Unauthorized' });
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const sessionToken = req.headers['x-session-token'] as string;
  if (sessionToken) {
    const session = sessionManager.getSession(sessionToken);
    if (session) {
      req.user = session.user;
    }
  }
  next();
}
