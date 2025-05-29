import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
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
    console.log('=== AUTH MIDDLEWARE DEBUG ===');
    console.log('Request URL:', req.url);
    console.log('Request method:', req.method);
    
    const authHeader = req.headers.authorization;
    console.log('Auth header present:', !!authHeader);
    
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      console.log('❌ No token provided');
      res.status(401).json({
        success: false,
        message: 'Access token required'
      });
      return;
    }

    console.log('Token length:', token.length);

    // Development mode fallback for mock token
    if (process.env.NODE_ENV === 'development' && token === 'dev-mock-token') {
      console.log('✅ Using development mock token');
      const mockUser = {
        id: 'dev-admin-id',
        email: 'admin@example.com',
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin',
        company: 'Development Company',
        phone: '+1234567890',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      req.user = mockUser as User;
      next();
      return;
    }

    console.log('Environment variables check:');
    console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'present' : 'missing');
    console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'present' : 'missing');

    // Create a Supabase client with the user's token
    console.log('🔍 Creating Supabase client with user token...');
    const supabaseWithUserToken = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    // Try to get the current user using their token
    console.log('🔍 Getting user with token...');
    const { data: { user }, error: userError } = await supabaseWithUserToken.auth.getUser();

    console.log('Supabase getUser result:');
    console.log('- User:', user ? { id: user.id, email: user.email } : 'null');
    console.log('- Error:', userError ? { message: userError.message } : 'null');

    if (userError || !user) {
      console.log('❌ Token verification failed');
      console.log('Error details:', JSON.stringify(userError, null, 2));
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
      return;
    }

    console.log('✅ Token verified successfully for user:', user.id);

    // Get user profile from our database using the user's token
    console.log('🔍 Fetching user profile from database with user token...');
    const { data: profile, error: profileError } = await supabaseWithUserToken
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    console.log('Profile query result:');
    console.log('- Profile:', profile ? { id: profile.id, email: profile.email, role: profile.role } : 'null');
    console.log('- Error:', profileError ? { message: profileError.message, code: profileError.code } : 'null');

    if (profileError || !profile) {
      console.log('❌ User profile not found');
      console.log('Profile error details:', JSON.stringify(profileError, null, 2));
      res.status(401).json({
        success: false,
        message: 'User profile not found'
      });
      return;
    }

    console.log('✅ Authentication successful for user:', profile.email);
    console.log('=== END AUTH MIDDLEWARE DEBUG ===');

    // Add user to request object
    req.user = profile as User;
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
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