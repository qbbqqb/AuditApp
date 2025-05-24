# Admin Panel Guide

## Overview

The Health & Safety Audit Application now includes a comprehensive admin panel that allows administrators to manage users, projects, and system settings. The admin panel provides full oversight and control over the application.

## Setup Instructions

### 1. Database Schema Update

First, update your database schema to include the admin role:

```bash
# Connect to your Supabase project SQL editor or use psql
# Run the admin_schema_update.sql script

psql -d your_database -f admin_schema_update.sql
```

Or run these commands in your Supabase SQL editor:

```sql
-- Add admin role to enum
ALTER TYPE user_role ADD VALUE 'admin' BEFORE 'client_safety_manager';
```

### 2. Create Dashboard Functions

Apply the dashboard functions to your database:

```bash
psql -d your_database -f create_dashboard_functions.sql
```

### 3. Create an Admin User

You can create an admin user through the Supabase dashboard or by updating an existing user:

```sql
-- Option 1: Update existing user to admin
UPDATE profiles 
SET role = 'admin'
WHERE email = 'your_admin_email@example.com';

-- Option 2: Create new admin user (after they sign up normally)
UPDATE profiles 
SET role = 'admin', company = 'System Administration'
WHERE id = 'user_uuid_here';
```

## Admin Panel Features

### 1. Admin Dashboard (`/admin`)

The main admin dashboard provides:

- **System Overview**: Total users, active projects, open findings, system health
- **Quick Stats**: Real-time metrics and status indicators
- **Navigation**: Quick access to all admin management areas
- **Activity Feed**: Recent system activity (coming soon)

### 2. User Management (`/admin/users`)

Complete user administration capabilities:

**Features:**
- View all users with filtering and search
- Create new users with role assignment
- Edit user profiles (name, email, role, company, phone)
- Activate/deactivate user accounts
- Send password reset emails
- Role-based access control

**User Roles:**
- `admin`: Full system access
- `client_safety_manager`: Can create findings, manage client-side audits
- `client_project_manager`: Client-side project oversight
- `gc_ehs_officer`: General contractor EHS responsibilities
- `gc_project_manager`: Contractor project management
- `gc_site_director`: Site-level contractor management

**User Creation:**
- Email and password-based authentication
- Automatic profile creation
- Email confirmation (configurable)
- Role assignment at creation time

### 3. Project Management (`/admin/projects`)

Complete project lifecycle management:

**Features:**
- View all projects with status tracking
- Create new projects with client/contractor relationships
- Edit project details and timelines
- Archive/activate projects
- Project status tracking (Active, Upcoming, Completed, Archived)

**Project Information:**
- Project name and description
- Client company
- Contractor company
- Start and end dates
- Active status

**Status Logic:**
- **Upcoming**: Start date is in the future
- **Active**: Current date is between start and end dates
- **Completed**: End date has passed
- **Archived**: Manually archived by admin

### 4. System Analytics (`/admin/analytics`)

*Coming Soon*: Comprehensive system analytics including:
- User activity metrics
- Project performance analytics
- Finding resolution trends
- System performance monitoring

### 5. System Settings (`/admin/settings`)

*Coming Soon*: System configuration options including:
- Email template management
- Notification preferences
- Security settings
- Integration configurations

## Access Control

### Role-Based Access

The admin panel implements strict role-based access control:

1. **Admin Role Required**: All admin panel routes require `admin` role
2. **Access Denied**: Non-admin users see an access denied page
3. **Navigation**: Admin panel only appears in navigation for admin users
4. **Data Scope**: Admins can see all data across the system

### Security Features

- **Authentication Required**: All admin functions require active session
- **Role Validation**: Server-side role checking on all admin operations
- **Audit Logging**: All admin actions are logged (coming soon)
- **Session Management**: Automatic logout on role changes

## API Integration

The admin panel integrates with Supabase for all operations:

### User Management APIs

- `supabase.auth.admin.createUser()`: Create new users
- `supabase.from('profiles')`: User profile management
- `supabase.auth.admin.generateLink()`: Password reset links

### Project Management APIs

- `supabase.from('projects')`: Full project CRUD operations
- Real-time updates and filtering
- Status calculation and tracking

## Database Schema

### Updated User Roles

```sql
CREATE TYPE user_role AS ENUM (
  'admin',
  'client_safety_manager',
  'client_project_manager', 
  'gc_ehs_officer',
  'gc_project_manager',
  'gc_site_director'
);
```

### Enhanced Functions

- `user_has_finding_access()`: Updated to grant admin full access
- `get_dashboard_metrics()`: Updated to provide admin-level metrics

## Usage Guide

### For Administrators

1. **Initial Setup**:
   - Apply database schema updates
   - Create your admin account
   - Log in and access `/admin`

2. **User Management**:
   - Navigate to Admin Panel → User Management
   - Create users for each role needed
   - Assign appropriate companies and permissions
   - Monitor user activity and status

3. **Project Setup**:
   - Navigate to Admin Panel → Project Management
   - Create projects with client/contractor relationships
   - Set appropriate timelines
   - Monitor project status and progress

4. **System Monitoring**:
   - Use the main admin dashboard for system overview
   - Monitor user activity and system health
   - Review project and finding metrics

### For Regular Users

- The admin panel is invisible to non-admin users
- No changes to existing user workflows
- Enhanced performance from optimized admin queries

## Navigation

Admin panel routes follow this structure:

```
/admin              - Main admin dashboard
/admin/users        - User management
/admin/projects     - Project management  
/admin/analytics    - System analytics (coming soon)
/admin/settings     - System settings (coming soon)
```

## Security Considerations

1. **Principle of Least Privilege**: Only grant admin access when necessary
2. **Regular Audits**: Review admin users and their activities regularly
3. **Strong Authentication**: Ensure admin accounts use strong passwords
4. **Session Management**: Admins should log out when finished
5. **Network Security**: Admin panel should only be accessible over HTTPS

## Troubleshooting

### Common Issues

1. **Access Denied**: Verify user has `admin` role in database
2. **Database Errors**: Ensure schema updates are applied correctly
3. **Function Errors**: Check that all PostgreSQL functions are created
4. **Permission Issues**: Verify Supabase RLS policies allow admin access

### Support

For technical support or questions about the admin panel:

1. Check this documentation first
2. Review the database schema and functions
3. Check browser console for client-side errors
4. Review Supabase logs for server-side issues

## Future Enhancements

Planned improvements for the admin panel:

1. **Enhanced Analytics**: Detailed system performance metrics
2. **Audit Logging**: Complete activity tracking and reporting
3. **Bulk Operations**: Mass user and project management
4. **Email Templates**: Customizable notification templates
5. **Integration Management**: Third-party system integrations
6. **Advanced Reporting**: Custom report generation and scheduling
7. **Role Management**: Custom role creation and permission sets 