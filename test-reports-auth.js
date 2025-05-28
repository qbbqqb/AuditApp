const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://itowglseznuietphtirc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0b3dnbHNlem51aWV0cGh0aXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMDk5OTUsImV4cCI6MjA2MzU4NTk5NX0.Z2pf7boDaeJtGci8CbUxk5cxFUiijgV6z3xxMwr9lpA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testReportsAuth() {
  try {
    console.log('Testing reports API authentication...');
    
    // Sign in as admin user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@example.com',
      password: 'SecurePass123'
    });

    if (authError) {
      console.error('Authentication failed:', authError);
      return;
    }

    console.log('✅ Authentication successful');
    console.log('User:', authData.user.email);
    console.log('Access token:', authData.session.access_token.substring(0, 50) + '...');

    // Test reports preview API
    const reportConfig = {
      name: 'Test Report',
      description: 'Testing authentication',
      dataSource: 'findings',
      filters: {
        dateRange: {
          start: '2024-01-01',
          end: '2024-12-31'
        },
        severity: [],
        status: [],
        category: [],
        projectId: [],
        assignedTo: []
      },
      columns: ['title', 'severity', 'status', 'created_at'],
      chartType: 'table',
      exportFormat: 'pdf'
    };

    const response = await fetch('http://localhost:3001/api/reports/preview', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authData.session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(reportConfig)
    });

    console.log('Reports API response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Reports API working!');
      console.log('Preview data rows:', data.data?.length || 0);
      console.log('Total rows:', data.totalRows || 0);
    } else {
      const errorText = await response.text();
      console.error('❌ Reports API failed:', response.status, errorText);
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testReportsAuth(); 