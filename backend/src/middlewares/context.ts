// src/middlewares/context.ts
import { Request, Response, NextFunction } from 'express';

export const userContext = (req: Request, res: Response, next: NextFunction) => {
  // Assume user ID comes from a decoded JWT
  req.body.context = {
    userId: req.headers['x-user-id'] || 'system',
    timestamp: new Date()
  };
  next();
};