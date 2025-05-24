import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

const SupabaseTest: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<string>('Testing...');
  const [error, setError] = useState<string>('');
  const [supabaseConfig, setSupabaseConfig] = useState({
    url: '',
    hasKey: false,
    urlMatchesExpected: false
  });

  // Define the expected URL directly in the component
  const expectedSupabaseUrl = 'https://itowglseznuietphtirc.supabase.co';

  useEffect(() => {
    // Check configuration
    const url = process.env.REACT_APP_SUPABASE_URL || '';
    const key = process.env.REACT_APP_SUPABASE_ANON_KEY || '';
    
    setSupabaseConfig({
      url: url,
      hasKey: !!key,
      urlMatchesExpected: url === expectedSupabaseUrl
    });

    // Test connection
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      console.log('Testing Supabase connection...');
      
      // Test 1: Simple health check
      const { data, error: healthError } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);

      if (healthError) {
        console.error('Health check failed:', healthError);
        setError(`Database connection failed: ${healthError.message}`);
        setConnectionStatus('❌ Connection Failed');
        return;
      }

      console.log('Health check passed:', data);
      setConnectionStatus('✅ Connected Successfully');

    } catch (err) {
      console.error('Connection test error:', err);
      setError(`Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setConnectionStatus('❌ Network Error');
    }
  };

  const testLogin = async () => {
    try {
      setError('');
      setConnectionStatus('Testing login...');

      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'admin@example.com',
        password: 'SecurePass123'
      });

      if (error) {
        setError(`Login error: ${error.message}`);
        setConnectionStatus('❌ Login Failed');
      } else {
        setConnectionStatus('✅ Login Test Passed');
        // Sign out immediately
        await supabase.auth.signOut();
      }
    } catch (err) {
      setError(`Login test error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setConnectionStatus('❌ Login Test Failed');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-lg rounded-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Supabase Connection Diagnostics</h2>
      
      <div className="space-y-4">
        <div className="p-4 bg-gray-50 rounded">
          <h3 className="font-medium text-gray-700 mb-2">Configuration Status</h3>
          <ul className="space-y-1 text-sm">
            <li>Supabase URL: {supabaseConfig.url ? '✅ Set' : '❌ Missing'}</li>
            <li>URL Value: <code className="bg-gray-200 px-1 rounded">{supabaseConfig.url}</code></li>
            <li>Expected URL: <code className="bg-gray-200 px-1 rounded">{expectedSupabaseUrl}</code></li>
            <li>URL Matches Expected: {supabaseConfig.urlMatchesExpected ? '✅ Yes' : '❌ No'}</li>
            <li>Anon Key: {supabaseConfig.hasKey ? '✅ Set' : '❌ Missing'}</li>
          </ul>
        </div>

        <div className="p-4 bg-blue-50 rounded">
          <h3 className="font-medium text-blue-700 mb-2">Connection Status</h3>
          <p className="text-lg">{connectionStatus}</p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded">
            <h3 className="font-medium text-red-700 mb-2">Error Details</h3>
            <p className="text-sm text-red-600 font-mono">{error}</p>
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={testConnection}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Test Connection
          </button>
          <button
            onClick={testLogin}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Test Login
          </button>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <h3 className="font-medium text-yellow-700 mb-2">Troubleshooting Steps</h3>
          <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
            <li>Check if environment variables are correctly set</li>
            <li>Verify Supabase project is active and accessible</li>
            <li>Check internet connection</li>
            <li>Verify Supabase API key permissions</li>
            <li>Check browser console for additional errors</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default SupabaseTest; 