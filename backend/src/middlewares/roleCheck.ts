import { Request, Response, NextFunction } from 'express';

// Define the shape of your User object (adjust fields as needed)
interface AuthRequest extends Request {
  user?: {
    role: string;
    id: string;
    // add other JWT payload fields here
  };
}

export const checkRole = (allowedRoles: string[]) => {
  // Use AuthRequest instead of Request to tell TS that 'user' exists
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: "Unauthorized Action" });
    }
    next();
  };
};

/**
 * STOP: The lines below (router.post...) should be moved to your 
 * routes file (e.g., src/routes/finance.routes.ts). 
 * If you leave them here, they will cause "Cannot find name" errors.
 */