# 🧪 Notification Testing Guide - Health & Safety Audit App

## 📋 Overview

This guide covers comprehensive testing of the notification system including:
- Email notifications via Resend API
- In-app notifications
- Escalation workflows
- Bulk import notifications

## 🔧 Prerequisites

### 1. Environment Configuration
Ensure these environment variables are set in your Supabase project:

```bash
# Required for email notifications
RESEND_API_KEY=re_xxxxxxxxxx
FROM_EMAIL=noreply@yourdomain.com
FRONTEND_URL=http://localhost:3000  # or your production URL
```

### 2. Database Setup
Verify the notifications table exists:

```sql
-- Check if notifications table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'notifications';

-- Check table structure
\d notifications;
```

## 🧪 Testing Methods

### Method 1: Direct Edge Function Testing

#### Test Email Function Directly
```bash
# Replace [project-ref] with your actual project reference
curl -X POST https://[project-ref].supabase.co/functions/v1/send-notification-email \
  -H "Authorization: Bearer [anon-key]" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "new_finding",
    "title": "Test Finding Assignment",
    "message": "This is a test notification",
    "email_data": {
      "recipient_email": "test@example.com",
      "recipient_name": "Test User",
      "finding_title": "Test Safety Finding",
      "finding_id": "test-finding-id",
      "due_date": "2024-12-31",
      "severity": "high",
      "project_name": "Test Project"
    }
  }'
```

#### Test Escalation Function
```bash
curl -X POST https://[project-ref].supabase.co/functions/v1/process-overdue-escalations \
  -H "Authorization: Bearer [service-role-key]" \
  -H "Content-Type: application/json"
```

### Method 2: Frontend Integration Testing

#### Test Finding Assignment Notification
1. **Create a new finding** with assignment
2. **Check browser console** for notification service calls
3. **Verify database** notification record creation
4. **Check email delivery** to assigned user

#### Test Status Change Notification
1. **Update finding status** in the UI
2. **Monitor network tab** for notification API calls
3. **Verify stakeholders** receive notifications
4. **Check email templates** render correctly

### Method 3: Database-Level Testing

#### Create Test Notification Directly
```sql
-- Insert test notification
INSERT INTO notifications (
  user_id,
  finding_id,
  type,
  title,
  message,
  is_read,
  email_sent
) VALUES (
  '[user-uuid]',
  '[finding-uuid]',
  'new_finding',
  'Test Notification',
  'This is a test notification message',
  false,
  false
);
```

#### Query Notification History
```sql
-- Check recent notifications
SELECT 
  n.*,
  p.first_name,
  p.last_name,
  p.email,
  f.title as finding_title
FROM notifications n
LEFT JOIN profiles p ON n.user_id = p.id
LEFT JOIN findings f ON n.finding_id = f.id
ORDER BY n.sent_at DESC
LIMIT 10;
```

## 📧 Email Template Testing

### Test All Notification Types

#### 1. New Finding Assignment
```javascript
// Frontend console test
import { NotificationService } from './services/notificationService';

await NotificationService.createNotification({
  user_id: 'user-uuid',
  finding_id: 'finding-uuid',
  type: 'new_finding',
  title: 'New Finding Assigned',
  message: 'You have been assigned a new safety finding',
  email_data: {
    recipient_email: 'test@example.com',
    recipient_name: 'Test User',
    finding_title: 'Unsafe ladder placement',
    finding_id: 'finding-uuid',
    due_date: '2024-12-31',
    severity: 'high',
    project_name: 'Office Renovation'
  }
});
```

#### 2. Status Update
```javascript
await NotificationService.notifyStatusChange(
  'finding-uuid',
  'in_progress',
  'updater-user-uuid'
);
```

#### 3. Escalation Alert
```javascript
await NotificationService.createNotification({
  user_id: 'supervisor-uuid',
  finding_id: 'finding-uuid',
  type: 'escalation',
  title: 'Overdue Finding Escalation - 3 Days',
  message: 'ESCALATION: Finding is 72 hours overdue',
  email_data: {
    recipient_email: 'supervisor@example.com',
    recipient_name: 'Supervisor Name',
    finding_title: 'Critical Safety Issue',
    finding_id: 'finding-uuid',
    due_date: '2024-01-01',
    severity: 'critical',
    project_name: 'Construction Site A',
    escalation_level: 3
  }
});
```

## 🔄 Escalation Testing

### Create Overdue Findings for Testing

```sql
-- Create test finding with past due date
INSERT INTO findings (
  id,
  title,
  description,
  severity,
  category,
  location,
  status,
  due_date,
  project_id,
  created_by,
  assigned_to
) VALUES (
  gen_random_uuid(),
  'Test Overdue Finding',
  'This is a test finding for escalation testing',
  'high',
  'fall_protection',
  'Test Location',
  'open',
  NOW() - INTERVAL '3 days',  -- 3 days overdue
  '[project-uuid]',
  '[creator-uuid]',
  '[assignee-uuid]'
);
```

### Manual Escalation Trigger
```bash
# Trigger escalation processing manually
curl -X POST https://[project-ref].supabase.co/functions/v1/process-overdue-escalations \
  -H "Authorization: Bearer [service-role-key]"
```

## 📱 Frontend Testing

### Test Notification UI Components

#### 1. Notification List
```javascript
// Test fetching user notifications
import { NotificationService } from './services/notificationService';

const notifications = await NotificationService.getUserNotifications('user-uuid', 10);
console.log('User notifications:', notifications);
```

#### 2. Mark as Read
```javascript
// Test marking notification as read
await NotificationService.markAsRead('notification-uuid');
```

#### 3. Mark All as Read
```javascript
// Test marking all notifications as read
await NotificationService.markAllAsRead('user-uuid');
```

## 🔍 Debugging & Monitoring

### Check Edge Function Logs
1. **Go to Supabase Dashboard**
2. **Navigate to Edge Functions**
3. **Select function** (send-notification-email or process-overdue-escalations)
4. **View logs** for errors and execution details

### Monitor Email Delivery
1. **Check Resend Dashboard** for delivery status
2. **Verify email content** in sent emails
3. **Test spam folder** delivery
4. **Check bounce/complaint rates**

### Database Monitoring
```sql
-- Check notification statistics
SELECT 
  type,
  COUNT(*) as total,
  COUNT(CASE WHEN email_sent = true THEN 1 END) as emails_sent,
  COUNT(CASE WHEN is_read = true THEN 1 END) as read_count
FROM notifications
WHERE sent_at >= NOW() - INTERVAL '24 hours'
GROUP BY type;

-- Check failed email attempts
SELECT *
FROM notifications
WHERE email_sent = false
AND sent_at >= NOW() - INTERVAL '24 hours'
ORDER BY sent_at DESC;
```

## 🧪 Automated Testing Scripts

### Create Test Data Script
```javascript
// test-notifications.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTestData() {
  // Create test users
  const testUsers = [
    { email: 'safety.manager@test.com', role: 'client_safety_manager' },
    { email: 'project.manager@test.com', role: 'gc_project_manager' },
    { email: 'site.director@test.com', role: 'gc_site_director' }
  ];

  // Create test project
  const { data: project } = await supabase
    .from('projects')
    .insert({
      name: 'Test Notification Project',
      client_company: 'Test Client',
      contractor_company: 'Test Contractor'
    })
    .select()
    .single();

  // Create test finding
  const { data: finding } = await supabase
    .from('findings')
    .insert({
      title: 'Test Notification Finding',
      description: 'This finding is for testing notifications',
      severity: 'high',
      category: 'fall_protection',
      location: 'Test Location',
      status: 'open',
      due_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      project_id: project.id,
      created_by: testUsers[0].id,
      assigned_to: testUsers[1].id
    })
    .select()
    .single();

  console.log('Test data created:', { project, finding });
}

createTestData().catch(console.error);
```

## ✅ Testing Checklist

### Email Notifications
- [ ] New finding assignment emails
- [ ] Status update emails
- [ ] Deadline reminder emails
- [ ] Overdue alert emails
- [ ] Escalation emails
- [ ] Email template formatting
- [ ] Email delivery to inbox (not spam)

### In-App Notifications
- [ ] Notification creation in database
- [ ] Notification display in UI
- [ ] Mark as read functionality
- [ ] Mark all as read functionality
- [ ] Real-time notification updates

### Escalation System
- [ ] Overdue finding detection
- [ ] Escalation rule application
- [ ] Role-based escalation routing
- [ ] Duplicate prevention
- [ ] Escalation email delivery

### Error Handling
- [ ] Invalid email addresses
- [ ] Missing user data
- [ ] Network failures
- [ ] Database connection issues
- [ ] Graceful degradation

### Performance
- [ ] Bulk notification processing
- [ ] Database query optimization
- [ ] Email sending rate limits
- [ ] Memory usage monitoring

## 🚨 Common Issues & Solutions

### Issue: Emails Not Sending
**Solutions:**
1. Check RESEND_API_KEY configuration
2. Verify FROM_EMAIL domain setup
3. Check Resend dashboard for errors
4. Validate email addresses format

### Issue: Notifications Not Created
**Solutions:**
1. Check RLS policies on notifications table
2. Verify user permissions
3. Check database connection
4. Review service role key permissions

### Issue: Escalations Not Triggering
**Solutions:**
1. Verify overdue findings exist
2. Check project assignments
3. Validate user roles
4. Review escalation rules logic

### Issue: Email Templates Not Rendering
**Solutions:**
1. Check template syntax
2. Verify data variables
3. Test with minimal data
4. Review HTML/CSS compatibility

## 📊 Performance Monitoring

### Key Metrics to Track
- **Email delivery rate** (successful sends / total attempts)
- **Notification read rate** (read notifications / total sent)
- **Escalation response time** (time from overdue to action)
- **System error rate** (failed operations / total operations)

### Monitoring Queries
```sql
-- Daily notification summary
SELECT 
  DATE(sent_at) as date,
  type,
  COUNT(*) as sent,
  COUNT(CASE WHEN email_sent THEN 1 END) as emails_delivered,
  AVG(CASE WHEN is_read THEN EXTRACT(EPOCH FROM (updated_at - sent_at))/3600 END) as avg_read_time_hours
FROM notifications
WHERE sent_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(sent_at), type
ORDER BY date DESC, type;
```

This comprehensive testing guide should help you thoroughly validate your notification system. Start with the direct Edge Function testing, then move to integration testing through the UI, and finally implement automated testing for ongoing validation. 