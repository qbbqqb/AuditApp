import { Request, Response } from 'express';
import { supabaseAdmin, supabase } from '../config/supabase';
import { CreateUserRequest, ApiResponse, User } from '../types';
import { validationResult } from 'express-validator';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
      return;
    }

    const userData: CreateUserRequest = req.body;

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true
    });

    if (authError || !authData.user) {
      res.status(400).json({
        success: false,
        message: authError?.message || 'Failed to create user'
      });
      return;
    }

    // Create user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        role: userData.role,
        company: userData.company,
        phone: userData.phone
      })
      .select()
      .single();

    if (profileError) {
      // Clean up auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      res.status(400).json({
        success: false,
        message: 'Failed to create user profile'
      });
      return;
    }

    const response: ApiResponse<User> = {
      success: true,
      data: profile as User,
      message: 'User created successfully'
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
      return;
    }

    // Development mode fallback when Supabase is unavailable
    if (process.env.NODE_ENV === 'development' && email === 'admin@example.com' && password === 'SecurePass123') {
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

      const mockSession = {
        access_token: 'dev-mock-token',
        refresh_token: 'dev-mock-refresh',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        token_type: 'bearer',
        user: {
          id: 'dev-admin-id',
          email: 'admin@example.com'
        }
      };

      const response: ApiResponse<{
        user: User;
        session: typeof mockSession;
      }> = {
        success: true,
        data: {
          user: mockUser as User,
          session: mockSession
        },
        message: 'Login successful (development mode)'
      };

      res.json(response);
      return;
    }

    // Sign in with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error || !data.user) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
      return;
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) {
      res.status(401).json({
        success: false,
        message: 'User profile not found'
      });
      return;
    }

    const response: ApiResponse<{
      user: User;
      session: typeof data.session;
    }> = {
      success: true,
      data: {
        user: profile as User,
        session: data.session
      },
      message: 'Login successful'
    };

    res.json(response);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      await supabaseAdmin.auth.admin.signOut(token);
    }

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const response: ApiResponse<User> = {
      success: true,
      data: req.user,
      message: 'Profile retrieved successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const { first_name, last_name, phone } = req.body;

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .update({
        first_name,
        last_name,
        phone,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) {
      res.status(400).json({
        success: false,
        message: 'Failed to update profile'
      });
      return;
    }

    const response: ApiResponse<User> = {
      success: true,
      data: profile as User,
      message: 'Profile updated successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}; 