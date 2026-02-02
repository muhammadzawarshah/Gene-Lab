// src/middlewares/error.middleware.ts
import { Request, Response, NextFunction } from 'express';

export const globalErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(`[ERROR] ${err.stack}`);

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    // Production mein stack trace hide karte hain
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};