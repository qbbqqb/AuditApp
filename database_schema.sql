-- Health and Safety Audit Tracking System Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security
ALTER DATABASE postgres SET row_security = on;

-- Create enum types
CREATE TYPE user_role AS ENUM (
  'admin',
  'client_safety_manager',
  'client_project_manager', 
  'gc_ehs_officer',
  'gc_project_manager',
  'gc_site_director'
);

CREATE TYPE finding_severity AS ENUM ('critical', 'high', 'medium', 'low');

CREATE TYPE finding_status AS ENUM (
  'open',
  'assigned', 
  'in_progress',
  'completed_pending_approval',
  'closed',
  'overdue'
);

CREATE TYPE finding_category AS ENUM (
  'fall_protection',
  'electrical_safety',
  'ppe_compliance',
  'housekeeping',
  'equipment_safety',
  'environmental',
  'fire_safety',
  'confined_space',
  'chemical_safety',
  'other'
);

CREATE TYPE notification_type AS ENUM (
  'new_finding',
  'status_update',
  'deadline_reminder',
  'overdue_alert',
  'escalation',
  'comment_added',
  'evidence_submitted'
);

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  client_company VARCHAR(255) NOT NULL,
  contractor_company VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role user_role NOT NULL,
  company VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

-- Project assignments (many-to-many relationship)
CREATE TABLE project_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, user_id)
);

-- Findings table
CREATE TABLE findings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(255) NOT NULL,
  severity finding_severity NOT NULL,
  status finding_status DEFAULT 'open',
  category finding_category NOT NULL,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  assigned_to UUID REFERENCES profiles(id),
  project_id UUID REFERENCES projects(id) NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP WITH TIME ZONE,
  regulatory_reference TEXT,
  immediate_action_required BOOLEAN DEFAULT false
);

-- Evidence/attachments table
CREATE TABLE evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  finding_id UUID REFERENCES findings(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES profiles(id) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_size INTEGER NOT NULL,
  description TEXT,
  is_corrective_action BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Comments table
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  finding_id UUID REFERENCES findings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  finding_id UUID REFERENCES findings(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  email_sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name VARCHAR(50) NOT NULL,
  record_id UUID NOT NULL,
  action VARCHAR(10) NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
  old_values JSONB,
  new_values JSONB,
  user_id UUID REFERENCES profiles(id),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Email templates table
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type notification_type UNIQUE NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_findings_status ON findings(status);
CREATE INDEX idx_findings_severity ON findings(severity);
CREATE INDEX idx_findings_due_date ON findings(due_date);
CREATE INDEX idx_findings_created_by ON findings(created_by);
CREATE INDEX idx_findings_assigned_to ON findings(assigned_to);
CREATE INDEX idx_findings_project_id ON findings(project_id);
CREATE INDEX idx_findings_created_at ON findings(created_at);

CREATE INDEX idx_evidence_finding_id ON evidence(finding_id);
CREATE INDEX idx_comments_finding_id ON comments(finding_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_findings_updated_at BEFORE UPDATE ON findings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update overdue findings
CREATE OR REPLACE FUNCTION update_overdue_findings()
RETURNS void AS $$
BEGIN
  UPDATE findings 
  SET status = 'overdue'
  WHERE due_date < CURRENT_TIMESTAMP 
    AND status NOT IN ('closed', 'overdue');
END;
$$ LANGUAGE plpgsql;

-- Helper function to check if user has access to finding
CREATE OR REPLACE FUNCTION user_has_finding_access(finding_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role user_role;
  user_company VARCHAR(255);
  finding_project_id UUID;
  client_company VARCHAR(255);
  contractor_company VARCHAR(255);
  is_assigned BOOLEAN;
  is_creator BOOLEAN;
BEGIN
  -- Get user role and company
  SELECT role, company INTO user_role, user_company
  FROM profiles WHERE id = user_id;
  
  -- Get finding details
  SELECT 
    f.project_id,
    p.client_company,
    p.contractor_company,
    f.assigned_to = user_id,
    f.created_by = user_id
  INTO finding_project_id, client_company, contractor_company, is_assigned, is_creator
  FROM findings f
  JOIN projects p ON f.project_id = p.id
  WHERE f.id = finding_id;
  
  -- Check access based on role and relationships
  CASE user_role
    WHEN 'client_safety_manager', 'client_project_manager' THEN
      RETURN user_company = client_company;
    WHEN 'gc_ehs_officer', 'gc_project_manager', 'gc_site_director' THEN
      RETURN user_company = contractor_company OR is_assigned OR is_creator;
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dashboard statistics view
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT 
  COUNT(*) as total_findings,
  COUNT(*) FILTER (WHERE status != 'closed') as open_findings,
  COUNT(*) FILTER (WHERE status = 'overdue' OR (due_date < CURRENT_TIMESTAMP AND status != 'closed')) as overdue_findings,
  COUNT(*) FILTER (WHERE severity = 'critical') as critical_findings,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'closed') * 100.0 / NULLIF(COUNT(*), 0), 
    1
  ) as completion_rate,
  ROUND(
    EXTRACT(EPOCH FROM AVG(closed_at - created_at)) / 86400, 
    1
  ) as avg_resolution_days
FROM findings;

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
-- Users can read their own profile and profiles of users in related projects
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can read colleagues profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_assignments pa1
      JOIN project_assignments pa2 ON pa1.project_id = pa2.project_id
      WHERE pa1.user_id = auth.uid() AND pa2.user_id = profiles.id
    )
  );

-- Projects RLS Policies
-- Users can see projects they're assigned to
CREATE POLICY "Users can read assigned projects" ON projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_assignments 
      WHERE project_id = projects.id AND user_id = auth.uid()
    )
  );

-- Client Safety Managers can create projects for their company
CREATE POLICY "Client Safety Managers can create projects" ON projects
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'client_safety_manager'
      AND company = projects.client_company
    )
  );

-- Project Assignments RLS Policies
CREATE POLICY "Users can read own assignments" ON project_assignments
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Project stakeholders can read assignments" ON project_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_assignments pa
      WHERE pa.project_id = project_assignments.project_id 
      AND pa.user_id = auth.uid()
    )
  );

-- Findings RLS Policies
-- Users can read findings they have access to
CREATE POLICY "Users can read accessible findings" ON findings
  FOR SELECT USING (user_has_finding_access(id, auth.uid()));

-- Client Safety Managers can create findings
CREATE POLICY "Client Safety Managers can create findings" ON findings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN projects proj ON p.company = proj.client_company
      WHERE p.id = auth.uid() 
      AND p.role = 'client_safety_manager'
      AND proj.id = findings.project_id
    )
  );

-- Users can update findings they created or are assigned to
CREATE POLICY "Users can update assigned findings" ON findings
  FOR UPDATE USING (
    created_by = auth.uid() OR 
    assigned_to = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('client_safety_manager', 'client_project_manager')
      AND user_has_finding_access(findings.id, auth.uid())
    )
  );

-- Evidence RLS Policies
-- Users can read evidence for findings they have access to
CREATE POLICY "Users can read evidence for accessible findings" ON evidence
  FOR SELECT USING (
    user_has_finding_access(finding_id, auth.uid())
  );

-- Users can upload evidence to findings they have access to
CREATE POLICY "Users can upload evidence to accessible findings" ON evidence
  FOR INSERT WITH CHECK (
    user_has_finding_access(finding_id, auth.uid())
  );

-- Users can delete their own evidence
CREATE POLICY "Users can delete own evidence" ON evidence
  FOR DELETE USING (uploaded_by = auth.uid());

-- Comments RLS Policies
-- Users can read comments for findings they have access to
CREATE POLICY "Users can read comments for accessible findings" ON comments
  FOR SELECT USING (
    user_has_finding_access(finding_id, auth.uid())
  );

-- Users can create comments on findings they have access to
CREATE POLICY "Users can comment on accessible findings" ON comments
  FOR INSERT WITH CHECK (
    user_has_finding_access(finding_id, auth.uid()) AND
    user_id = auth.uid()
  );

-- Users can update their own comments
CREATE POLICY "Users can update own comments" ON comments
  FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments" ON comments
  FOR DELETE USING (user_id = auth.uid());

-- Notifications RLS Policies
-- Users can only read their own notifications
CREATE POLICY "Users can read own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- System can create notifications (via service role)
CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- Audit Logs RLS Policies
-- Only allow reading audit logs for records user has access to
CREATE POLICY "Users can read relevant audit logs" ON audit_logs
  FOR SELECT USING (
    CASE table_name
      WHEN 'findings' THEN user_has_finding_access(record_id, auth.uid())
      WHEN 'profiles' THEN record_id = auth.uid()
      ELSE false
    END
  );

-- =============================================================================
-- HELPER FUNCTIONS FOR FRONTEND
-- =============================================================================

-- Function to get user's accessible projects
CREATE OR REPLACE FUNCTION get_user_projects(user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  client_company VARCHAR(255),
  contractor_company VARCHAR(255),
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.client_company, p.contractor_company, 
         p.start_date, p.end_date, p.is_active
  FROM projects p
  JOIN project_assignments pa ON p.id = pa.project_id
  WHERE pa.user_id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get dashboard metrics for current user
CREATE OR REPLACE FUNCTION get_dashboard_metrics(user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  total_findings BIGINT,
  open_findings BIGINT,
  overdue_findings BIGINT,
  critical_findings BIGINT,
  completion_rate NUMERIC,
  avg_resolution_days NUMERIC
) AS $$
BEGIN
  RETURN QUERY
SELECT 
  COUNT(*) as total_findings,
    COUNT(*) FILTER (WHERE f.status != 'closed') as open_findings,
    COUNT(*) FILTER (WHERE f.status = 'overdue' OR (f.due_date < CURRENT_TIMESTAMP AND f.status != 'closed')) as overdue_findings,
    COUNT(*) FILTER (WHERE f.severity = 'critical') as critical_findings,
    ROUND(
      COUNT(*) FILTER (WHERE f.status = 'closed') * 100.0 / NULLIF(COUNT(*), 0), 
      1
    ) as completion_rate,
    ROUND(
      EXTRACT(EPOCH FROM AVG(f.closed_at - f.created_at)) / 86400, 
      1
    ) as avg_resolution_days
  FROM findings f
  WHERE user_has_finding_access(f.id, user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 