#!/usr/bin/env node

/**
 * Notification Testing Script for Health & Safety Audit App
 * 
 * This script tests the notification system by:
 * 1. Testing direct email function calls
 * 2. Creating test notifications in the database
 * 3. Triggering escalation processing
 * 
 * Usage: node test-notifications.js
 */

const https = require('https');

// Configuration - Update these with your actual values
const CONFIG = {
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://your-project-ref.supabase.co',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'your-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key',
  TEST_EMAIL: process.env.TEST_EMAIL || 'test@example.com',
  PROJECT_REF: process.env.PROJECT_REF || 'your-project-ref'
};

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null
          };
          resolve(result);
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test 1: Direct Email Function Test
async function testEmailFunction() {
  console.log('\n🧪 Testing Email Function...');
  
  const testData = {
    type: 'new_finding',
    title: 'Test Finding Assignment',
    message: 'This is a test notification from the automated testing script',
    email_data: {
      recipient_email: CONFIG.TEST_EMAIL,
      recipient_name: 'Test User',
      finding_title: 'Test Safety Finding - Automated Test',
      finding_id: 'test-finding-' + Date.now(),
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      severity: 'high',
      project_name: 'Test Project - Notification Testing'
    }
  };

  const options = {
    hostname: CONFIG.PROJECT_REF + '.supabase.co',
    port: 443,
    path: '/functions/v1/send-notification-email',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    }
  };

  try {
    const result = await makeRequest(options, testData);
    
    if (result.statusCode === 200) {
      console.log('✅ Email function test PASSED');
      console.log('📧 Email sent successfully:', result.body);
    } else {
      console.log('❌ Email function test FAILED');
      console.log('Status:', result.statusCode);
      console.log('Response:', result.body);
    }
  } catch (error) {
    console.log('❌ Email function test ERROR:', error.message);
  }
}

// Test 2: Escalation Function Test
async function testEscalationFunction() {
  console.log('\n🚨 Testing Escalation Function...');
  
  const options = {
    hostname: CONFIG.PROJECT_REF + '.supabase.co',
    port: 443,
    path: '/functions/v1/process-overdue-escalations',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CONFIG.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    }
  };

  try {
    const result = await makeRequest(options);
    
    if (result.statusCode === 200) {
      console.log('✅ Escalation function test PASSED');
      console.log('📊 Escalation results:', result.body);
    } else {
      console.log('❌ Escalation function test FAILED');
      console.log('Status:', result.statusCode);
      console.log('Response:', result.body);
    }
  } catch (error) {
    console.log('❌ Escalation function test ERROR:', error.message);
  }
}

// Test 3: Test All Email Templates
async function testAllEmailTemplates() {
  console.log('\n📧 Testing All Email Templates...');
  
  const templates = [
    {
      type: 'new_finding',
      title: 'New Finding Assigned - Template Test',
      message: 'Testing new finding assignment template'
    },
    {
      type: 'status_update',
      title: 'Finding Status Updated - Template Test',
      message: 'Testing status update template'
    },
    {
      type: 'deadline_reminder',
      title: 'Finding Deadline Reminder - Template Test',
      message: 'Testing deadline reminder template'
    },
    {
      type: 'overdue_alert',
      title: 'Overdue Finding Alert - Template Test',
      message: 'Testing overdue alert template'
    },
    {
      type: 'escalation',
      title: 'Finding Escalation - Template Test',
      message: 'Testing escalation template'
    }
  ];

  for (const template of templates) {
    console.log(`\n  Testing ${template.type} template...`);
    
    const testData = {
      ...template,
      email_data: {
        recipient_email: CONFIG.TEST_EMAIL,
        recipient_name: 'Template Test User',
        finding_title: `Test Finding for ${template.type}`,
        finding_id: `test-${template.type}-${Date.now()}`,
        due_date: new Date().toISOString(),
        severity: 'medium',
        project_name: 'Template Testing Project',
        escalation_level: template.type === 'escalation' ? 2 : undefined
      }
    };

    const options = {
      hostname: CONFIG.PROJECT_REF + '.supabase.co',
      port: 443,
      path: '/functions/v1/send-notification-email',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    try {
      const result = await makeRequest(options, testData);
      
      if (result.statusCode === 200) {
        console.log(`  ✅ ${template.type} template test PASSED`);
      } else {
        console.log(`  ❌ ${template.type} template test FAILED (${result.statusCode})`);
      }
    } catch (error) {
      console.log(`  ❌ ${template.type} template test ERROR:`, error.message);
    }

    // Wait 1 second between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Test 4: Configuration Check
function testConfiguration() {
  console.log('\n⚙️  Checking Configuration...');
  
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY', 
    'SUPABASE_SERVICE_ROLE_KEY',
    'PROJECT_REF'
  ];

  let configValid = true;
  
  for (const varName of requiredVars) {
    if (!CONFIG[varName] || CONFIG[varName].includes('your-')) {
      console.log(`❌ ${varName} not configured properly`);
      configValid = false;
    } else {
      console.log(`✅ ${varName} configured`);
    }
  }

  if (!configValid) {
    console.log('\n⚠️  Please update the CONFIG object with your actual values');
    console.log('   You can also set environment variables:');
    console.log('   - SUPABASE_URL');
    console.log('   - SUPABASE_ANON_KEY');
    console.log('   - SUPABASE_SERVICE_ROLE_KEY');
    console.log('   - PROJECT_REF');
    console.log('   - TEST_EMAIL (optional)');
  }

  return configValid;
}

// Main test runner
async function runTests() {
  console.log('🧪 Health & Safety Audit App - Notification Testing');
  console.log('================================================');
  
  // Check configuration first
  if (!testConfiguration()) {
    process.exit(1);
  }

  console.log('\n🚀 Starting notification tests...');
  
  try {
    // Run all tests
    await testEmailFunction();
    await testEscalationFunction();
    await testAllEmailTemplates();
    
    console.log('\n✅ All tests completed!');
    console.log('\n📋 Next Steps:');
    console.log('1. Check your email inbox for test notifications');
    console.log('2. Review Supabase Edge Function logs for any errors');
    console.log('3. Check Resend dashboard for email delivery status');
    console.log('4. Verify notifications table in your database');
    
  } catch (error) {
    console.log('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run the tests if this script is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  testEmailFunction,
  testEscalationFunction,
  testAllEmailTemplates,
  testConfiguration
}; 