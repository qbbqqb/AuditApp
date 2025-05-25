import React, { useState } from 'react';
import { NotificationService } from '../../services/notificationService';
import { supabase } from '../../config/supabase';

interface TestResult {
  type: string;
  success: boolean;
  message: string;
  timestamp: Date;
}

export const NotificationTester: React.FC = () => {
  const [testEmail, setTestEmail] = useState('test@example.com');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);

  const addTestResult = (type: string, success: boolean, message: string) => {
    setTestResults(prev => [...prev, {
      type,
      success,
      message,
      timestamp: new Date()
    }]);
  };

  const testEmailFunction = async () => {
    setLoading(true);
    try {
      const testData = {
        type: 'new_finding',
        title: 'Test Finding Assignment',
        message: 'This is a test notification from the admin panel',
        email_data: {
          recipient_email: testEmail,
          recipient_name: 'Test User',
          finding_title: 'Test Safety Finding - Admin Panel Test',
          finding_id: 'test-finding-' + Date.now(),
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          severity: 'high',
          project_name: 'Test Project - Admin Testing'
        }
      };

      const { error } = await supabase.functions.invoke('send-notification-email', {
        body: testData
      });

      if (error) {
        addTestResult('Email Function', false, `Error: ${error.message}`);
      } else {
        addTestResult('Email Function', true, 'Email sent successfully');
      }
    } catch (error: any) {
      addTestResult('Email Function', false, `Exception: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testEscalationFunction = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-overdue-escalations');

      if (error) {
        addTestResult('Escalation Function', false, `Error: ${error.message}`);
      } else {
        addTestResult('Escalation Function', true, `Processed: ${JSON.stringify(data)}`);
      }
    } catch (error: any) {
      addTestResult('Escalation Function', false, `Exception: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testNotificationService = async () => {
    setLoading(true);
    try {
      // Create a test notification using the service
      await NotificationService.createNotification({
        user_id: 'test-user-id',
        finding_id: 'test-finding-id',
        type: 'new_finding',
        title: 'Test Service Notification',
        message: 'Testing the notification service directly',
        email_data: {
          recipient_email: testEmail,
          recipient_name: 'Test User',
          finding_title: 'Service Test Finding',
          finding_id: 'test-service-finding',
          due_date: new Date().toISOString(),
          severity: 'medium',
          project_name: 'Service Test Project'
        }
      });

      addTestResult('Notification Service', true, 'Service call completed successfully');
    } catch (error: any) {
      addTestResult('Notification Service', false, `Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testAllTemplates = async () => {
    setLoading(true);
    const templates = [
      { type: 'new_finding', title: 'New Finding Test' },
      { type: 'status_update', title: 'Status Update Test' },
      { type: 'deadline_reminder', title: 'Deadline Reminder Test' },
      { type: 'overdue_alert', title: 'Overdue Alert Test' },
      { type: 'escalation', title: 'Escalation Test' }
    ];

    for (const template of templates) {
      try {
        const testData = {
          type: template.type,
          title: template.title,
          message: `Testing ${template.type} template`,
          email_data: {
            recipient_email: testEmail,
            recipient_name: 'Template Test User',
            finding_title: `Test Finding for ${template.type}`,
            finding_id: `test-${template.type}-${Date.now()}`,
            due_date: new Date().toISOString(),
            severity: 'medium',
            project_name: 'Template Testing Project',
            escalation_level: template.type === 'escalation' ? 2 : undefined
          }
        };

        const { error } = await supabase.functions.invoke('send-notification-email', {
          body: testData
        });

        if (error) {
          addTestResult(`Template: ${template.type}`, false, `Error: ${error.message}`);
        } else {
          addTestResult(`Template: ${template.type}`, true, 'Template test successful');
        }

        // Wait 1 second between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error: any) {
        addTestResult(`Template: ${template.type}`, false, `Exception: ${error.message}`);
      }
    }
    setLoading(false);
  };

  const checkDatabaseNotifications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(5);

      if (error) {
        addTestResult('Database Check', false, `Error: ${error.message}`);
      } else {
        addTestResult('Database Check', true, `Found ${data?.length || 0} recent notifications`);
      }
    } catch (error: any) {
      addTestResult('Database Check', false, `Exception: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Notification System Tester</h3>
        <p className="text-sm text-gray-600 mb-4">
          Test the notification system components to ensure they're working correctly.
        </p>
        
        <div className="mb-4">
          <label htmlFor="testEmail" className="block text-sm font-medium text-gray-700 mb-2">
            Test Email Address
          </label>
          <input
            type="email"
            id="testEmail"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter email to receive test notifications"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <button
          onClick={testEmailFunction}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Test Email Function
        </button>
        
        <button
          onClick={testEscalationFunction}
          disabled={loading}
          className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Test Escalation Function
        </button>
        
        <button
          onClick={testNotificationService}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Test Notification Service
        </button>
        
        <button
          onClick={testAllTemplates}
          disabled={loading}
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Test All Templates
        </button>
        
        <button
          onClick={checkDatabaseNotifications}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Check Database
        </button>
        
        <button
          onClick={clearResults}
          disabled={loading}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Clear Results
        </button>
      </div>

      {loading && (
        <div className="mb-4 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">Running tests...</span>
        </div>
      )}

      {testResults.length > 0 && (
        <div className="border-t pt-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Test Results</h4>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded-md border ${
                  result.success
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="mr-2">
                      {result.success ? '✅' : '❌'}
                    </span>
                    <span className="font-medium">{result.type}</span>
                  </div>
                  <span className="text-xs">
                    {result.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <div className="mt-1 text-sm">
                  {result.message}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h5 className="font-medium text-blue-900 mb-2">Testing Tips:</h5>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Check your email inbox for test notifications</li>
          <li>• Review Supabase Edge Function logs for detailed error information</li>
          <li>• Verify Resend dashboard for email delivery status</li>
          <li>• Check the notifications table in your database</li>
          <li>• Ensure RESEND_API_KEY and FROM_EMAIL are configured</li>
        </ul>
      </div>
    </div>
  );
}; 