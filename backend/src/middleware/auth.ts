import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { User } from '../types';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access token required'
      });
      return;
    }

    // Development mode fallback for mock token
    if (process.env.NODE_ENV === 'development' && token === 'dev-mock-token') {
      const mockUser = {
        id: 'dev-admin-id',
        email: 'admin@example.com',
        first_name: 'Admin',
        last_name: 'User',
        role: 'CLIENT_SAFETY_MANAGER',
        company: 'Development Company',
        phone: '+1234567890',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      req.user = mockUser as User;
      next();
      return;
    }

    // Verify token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
      return;
    }

    // Get user profile from our database
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      res.status(401).json({
        success: false,
        message: 'User profile not found'
      });
      return;
    }

    // Add user to request object
    req.user = profile as User;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

// Role-based authorization middleware
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
      return;
    }

    next();
  };
}; 