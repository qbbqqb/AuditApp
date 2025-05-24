import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

const ConnectionTest: React.FC = () => {
  const [status, setStatus] = useState<string>('Testing...');
  const [details, setDetails] = useState<string>('');

  useEffect(() => {
    const testConnection = async () => {
      try {
        // Test basic connection
        const { data, error } = await supabase
          .from('profiles')
          .select('count')
          .limit(1);

        if (error) {
          setStatus('❌ Connection Failed');
          setDetails(`Error: ${error.message}\nCode: ${error.code}\nDetails: ${error.details}`);
        } else {
          setStatus('✅ Connection Successful!');
          setDetails(`Successfully connected to Supabase!\nResponse: ${JSON.stringify(data, null, 2)}`);
        }
      } catch (err) {
        setStatus('❌ Network Error');
        setDetails(`Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };

    testConnection();
  }, []);

  const testAuth = async () => {
    try {
      setStatus('Testing auth...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'admin@example.com',
        password: 'password123'
      });

      if (error) {
        setStatus('❌ Auth Failed');
        setDetails(`Auth Error: ${error.message}`);
      } else {
        setStatus('✅ Auth Successful!');
        setDetails(`Login successful: ${JSON.stringify(data.user?.email)}`);
      }
    } catch (err) {
      setStatus('❌ Auth Network Error');
      setDetails(`Auth network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Supabase Connection Test</h2>
      
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Status:</h3>
        <div className={`p-3 rounded ${
          status.includes('✅') ? 'bg-green-100 text-green-800' : 
          status.includes('❌') ? 'bg-red-100 text-red-800' : 
          'bg-blue-100 text-blue-800'
        }`}>
          {status}
        </div>
      </div>

      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Details:</h3>
        <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
          {details}
        </pre>
      </div>

      <div className="flex gap-2">
        <button
          onClick={testAuth}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          Test Login
        </button>
        <button
          onClick={() => window.location.reload()}
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
        >
          Refresh Test
        </button>
      </div>
    </div>
  );
};

export default ConnectionTest; 