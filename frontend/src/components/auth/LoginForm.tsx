import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('admin123'); // Defaulting to the reset password
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  // const { signIn } = useAuth(); // Not using AuthContext signIn directly anymore
  const navigate = useNavigate();

  useEffect(() => {
    const url = process.env.REACT_APP_SUPABASE_URL;
    const key = process.env.REACT_APP_SUPABASE_ANON_KEY;
    
    // console.log('Current Environment Variables:');
    // console.log('REACT_APP_SUPABASE_URL:', url);
    // console.log('REACT_APP_SUPABASE_ANON_KEY:', key ? `${key.substring(0, 20)}...` : 'Missing');
    // console.log('Supabase client initialized with URL:', url);
    
    setDebugInfo(`
      Supabase URL: ${url ? '✅ Set' : '❌ Missing'}
      Anon Key: ${key ? '✅ Set' : '❌ Missing'}
      URL Value: ${url || 'undefined'}
      Expected: ${url || 'undefined'}
      Match: ✅
    `);
  }, []);

  const testConnection = async () => {
    try {
      setError('Testing connection...');
      const currentUrl = process.env.REACT_APP_SUPABASE_URL;
      console.log('🔍 Testing connection to:', currentUrl);
      
      console.log('📊 Testing database connection...');
      const { data, error: dbError } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);
      
      if (dbError) {
        console.error('❌ Database connection test error:', dbError);
        setError(`Database test failed: ${dbError.message}`);
        return;
      } else {
        console.log('✅ Database connection successful:', data);
      }

      console.log('🔐 Testing auth endpoint...');
      try {
        const authUrl = `${currentUrl}/auth/v1/health`;
        console.log('🎯 Testing auth health endpoint:', authUrl);
        
        const response = await fetch(authUrl);
        console.log('📡 Auth endpoint response status:', response.status);
        
        if (response.ok) {
          console.log('✅ Auth endpoint is reachable');
          setError('✅ All connections successful! Database ✅ Auth Endpoint ✅');
        } else {
          console.error('❌ Auth endpoint returned:', response.status);
          setError(`⚠️ Database OK, but Auth endpoint issue: ${response.status}`);
        }
      } catch (authErr) {
        console.error('❌ Auth endpoint test failed:', authErr);
        setError('⚠️ Database OK, but Auth endpoint unreachable');
      }
      
    } catch (err) {
      console.error('🔥 Network error during test:', err);
      setError(`Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const timeoutId = setTimeout(() => {
      setLoading(false);
      setError('Login timed out. Please try again.');
    }, 10000);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      clearTimeout(timeoutId);

      if (authError) {
        console.error('Supabase auth error:', authError);
        setError(`Login failed: ${authError.message}`);
        setLoading(false);
        return;
      } 
      
      if (data?.user && data?.session) {
        console.log('Login successful, navigating to dashboard...');
        setLoading(false);
        setTimeout(() => {
          navigate('/dashboard');
        }, 100);
    } else {
        setError('Login failed: No user data returned');
        setLoading(false);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('Network/connection error:', err);
      setError(`Failed to fetch: ${err instanceof Error ? err.message : 'Network error'}`);
      setLoading(false);
    }
  };

  const handleForceRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Health & Safety Audit Tracking System
          </p>
        </div>
        
        <div className="bg-gray-100 p-4 rounded text-xs">
          <strong>Debug Info:</strong>
          <pre>{debugInfo}</pre>
          <button
            onClick={handleForceRefresh}
            className="mt-2 text-blue-600 hover:text-blue-700 text-xs underline"
          >
            🔄 Force Refresh Page
          </button>
        </div>

          {error && (
          <div className={`border px-4 py-3 rounded ${
            error.includes('successful') || error.includes('✅') 
              ? 'bg-green-50 border-green-200 text-green-700' 
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
              {error}
            </div>
          )}
          
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
            
            <button
              type="button"
              onClick={testConnection}
              className="py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Test Connection
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                Sign up here
              </Link>
            </p>
          </div>
          
          {/* Removed Connection Diagnostics link as Test Connection button provides similar info and is more prominent */}
        </form>
      </div>
    </div>
  );
};

export default LoginForm; 