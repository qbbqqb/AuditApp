import { createClient } from '@supabase/supabase-js';

// Force fresh environment variable reading
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

// Explicit validation and logging
console.log('🔧 Supabase Config Initialization:');
console.log('URL:', supabaseUrl);
console.log('Key exists:', !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('REACT_APP_SUPABASE_URL:', supabaseUrl);
  console.error('REACT_APP_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing');
}

// Validate URL format
if (supabaseUrl && !(supabaseUrl.startsWith('http://localhost') || supabaseUrl.includes('.supabase.co'))) {
  console.error('❌ Invalid Supabase URL format. Should be a Supabase URL or localhost:', supabaseUrl);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

console.log('✅ Supabase client created successfully');

export default supabase; 