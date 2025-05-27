-- =============================================================================
-- DATABASE SECURITY FIXES MIGRATION
-- Fixes all critical security errors and warnings from Supabase linter
-- =============================================================================

-- =============================================================================
-- 1. FIX CRITICAL SECURITY ERRORS
-- =============================================================================

-- Enable RLS on tables that are missing it
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Fix SECURITY DEFINER view by recreating without SECURITY DEFINER
DROP VIEW IF EXISTS dashboard_stats;
CREATE VIEW dashboard_stats AS
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
-- 2. ADD MISSING INDEXES FOR FOREIGN KEYS (Performance)
-- =============================================================================

-- Add indexes for foreign keys that don't have covering indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_evidence_uploaded_by ON evidence(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_notifications_finding_id ON notifications(finding_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_user_id ON project_assignments(user_id);

-- Add composite indexes for better performance
CREATE INDEX IF NOT EXISTS idx_project_assignments_project_user ON project_assignments(project_id, user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_findings_project_status ON findings(project_id, status);
CREATE INDEX IF NOT EXISTS idx_evidence_finding_type ON evidence(finding_id, file_type);

-- =============================================================================
-- 3. FIX FUNCTION SEARCH PATH WARNINGS
-- =============================================================================

-- Fix user_has_finding_access function
CREATE OR REPLACE FUNCTION user_has_finding_access(finding_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_profile_role user_role;
  user_company VARCHAR(255);
  finding_project_id UUID;
  client_company VARCHAR(255);
  contractor_company VARCHAR(255);
  is_assigned BOOLEAN;
  is_creator BOOLEAN;
BEGIN
  -- Get user role and company
  SELECT role, company INTO user_profile_role, user_company
  FROM profiles WHERE id = user_id;

  -- Admins have access to all findings
  IF user_profile_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
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

  -- If finding not found, or project not found, deny access
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check access based on role and relationships
  CASE user_profile_role
    WHEN 'client_safety_manager', 'client_project_manager' THEN
      RETURN user_company = client_company AND EXISTS (SELECT 1 FROM project_assignments pa WHERE pa.project_id = finding_project_id AND pa.user_id = user_id);
    WHEN 'gc_ehs_officer', 'gc_project_manager', 'gc_site_director' THEN
      RETURN (user_company = contractor_company AND EXISTS (SELECT 1 FROM project_assignments pa WHERE pa.project_id = finding_project_id AND pa.user_id = user_id)) OR is_assigned OR is_creator;
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Fix admin_create_user function
CREATE OR REPLACE FUNCTION admin_create_user(
  user_email VARCHAR(255),
  user_first_name VARCHAR(100),
  user_last_name VARCHAR(100),
  user_role user_role,
  user_company VARCHAR(255),
  user_phone VARCHAR(20) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_user_id UUID;
  current_user_role user_role;
BEGIN
  -- Check if current user is admin
  SELECT role INTO current_user_role FROM profiles WHERE id = auth.uid();
  
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can create users';
  END IF;

  -- Generate new UUID for user
  new_user_id := uuid_generate_v4();
  
  -- Insert into profiles table
  INSERT INTO profiles (
    id, email, first_name, last_name, role, company, phone
  ) VALUES (
    new_user_id, user_email, user_first_name, user_last_name, user_role, user_company, user_phone
  );
  
  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix refresh_analytics_views function
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY daily_analytics_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY weekly_analytics_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix get_analytics_export function
CREATE OR REPLACE FUNCTION get_analytics_export(
  start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  finding_id UUID,
  title VARCHAR(255),
  severity finding_severity,
  status finding_status,
  category finding_category,
  project_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.title,
    f.severity,
    f.status,
    f.category,
    p.name,
    f.created_at,
    f.due_date,
    f.closed_at
  FROM findings f
  JOIN projects p ON f.project_id = p.id
  WHERE f.created_at::DATE BETWEEN start_date AND end_date
  ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix get_dashboard_metrics function
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix get_analytics_trends function
CREATE OR REPLACE FUNCTION get_analytics_trends(
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  new_findings BIGINT,
  closed_findings BIGINT,
  overdue_findings BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.date,
    COALESCE(nf.count, 0) as new_findings,
    COALESCE(cf.count, 0) as closed_findings,
    COALESCE(of.count, 0) as overdue_findings
  FROM generate_series(
    CURRENT_DATE - INTERVAL '1 day' * days_back,
    CURRENT_DATE,
    INTERVAL '1 day'
  ) d(date)
  LEFT JOIN (
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM findings
    WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * days_back
    GROUP BY DATE(created_at)
  ) nf ON d.date = nf.date
  LEFT JOIN (
    SELECT DATE(closed_at) as date, COUNT(*) as count
    FROM findings
    WHERE closed_at >= CURRENT_DATE - INTERVAL '1 day' * days_back
    GROUP BY DATE(closed_at)
  ) cf ON d.date = cf.date
  LEFT JOIN (
    SELECT DATE(updated_at) as date, COUNT(*) as count
    FROM findings
    WHERE status = 'overdue' AND updated_at >= CURRENT_DATE - INTERVAL '1 day' * days_back
    GROUP BY DATE(updated_at)
  ) of ON d.date = of.date
  ORDER BY d.date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix get_category_analytics function
CREATE OR REPLACE FUNCTION get_category_analytics()
RETURNS TABLE (
  category finding_category,
  total_count BIGINT,
  open_count BIGINT,
  closed_count BIGINT,
  avg_resolution_days NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.category,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE f.status != 'closed') as open_count,
    COUNT(*) FILTER (WHERE f.status = 'closed') as closed_count,
    ROUND(
      EXTRACT(EPOCH FROM AVG(f.closed_at - f.created_at)) / 86400, 
      1
    ) as avg_resolution_days
  FROM findings f
  GROUP BY f.category
  ORDER BY total_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix get_performance_analytics function
CREATE OR REPLACE FUNCTION get_performance_analytics()
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  total_assigned BIGINT,
  completed BIGINT,
  overdue BIGINT,
  avg_resolution_days NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.first_name || ' ' || p.last_name as user_name,
    COUNT(f.id) as total_assigned,
    COUNT(f.id) FILTER (WHERE f.status = 'closed') as completed,
    COUNT(f.id) FILTER (WHERE f.status = 'overdue') as overdue,
    ROUND(
      EXTRACT(EPOCH FROM AVG(f.closed_at - f.created_at)) / 86400, 
      1
    ) as avg_resolution_days
  FROM profiles p
  LEFT JOIN findings f ON p.id = f.assigned_to
  WHERE p.role IN ('gc_ehs_officer', 'gc_project_manager', 'gc_site_director')
  GROUP BY p.id, p.first_name, p.last_name
  ORDER BY total_assigned DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix get_project_health function
CREATE OR REPLACE FUNCTION get_project_health()
RETURNS TABLE (
  project_id UUID,
  project_name VARCHAR(255),
  total_findings BIGINT,
  open_findings BIGINT,
  overdue_findings BIGINT,
  health_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    COUNT(f.id) as total_findings,
    COUNT(f.id) FILTER (WHERE f.status != 'closed') as open_findings,
    COUNT(f.id) FILTER (WHERE f.status = 'overdue') as overdue_findings,
    CASE 
      WHEN COUNT(f.id) = 0 THEN 100
      ELSE ROUND(
        (COUNT(f.id) FILTER (WHERE f.status = 'closed') * 100.0 / COUNT(f.id)) - 
        (COUNT(f.id) FILTER (WHERE f.status = 'overdue') * 10.0), 
        1
      )
    END as health_score
  FROM projects p
  LEFT JOIN findings f ON p.id = f.project_id
  WHERE p.is_active = true
  GROUP BY p.id, p.name
  ORDER BY health_score DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix get_compliance_metrics function
CREATE OR REPLACE FUNCTION get_compliance_metrics()
RETURNS TABLE (
  total_findings BIGINT,
  critical_findings BIGINT,
  overdue_findings BIGINT,
  compliance_rate NUMERIC,
  avg_response_time NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_findings,
    COUNT(*) FILTER (WHERE severity = 'critical') as critical_findings,
    COUNT(*) FILTER (WHERE status = 'overdue') as overdue_findings,
    ROUND(
      (COUNT(*) FILTER (WHERE status = 'closed') * 100.0 / NULLIF(COUNT(*), 0)), 
      1
    ) as compliance_rate,
    ROUND(
      EXTRACT(EPOCH FROM AVG(closed_at - created_at)) / 3600, 
      1
    ) as avg_response_time
  FROM findings
  WHERE created_at >= CURRENT_DATE - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix get_risk_assessment function
CREATE OR REPLACE FUNCTION get_risk_assessment()
RETURNS TABLE (
  risk_level TEXT,
  finding_count BIGINT,
  percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH risk_data AS (
    SELECT 
      CASE 
        WHEN severity = 'critical' AND status != 'closed' THEN 'High Risk'
        WHEN severity = 'high' AND status != 'closed' THEN 'Medium Risk'
        WHEN severity IN ('medium', 'low') AND status != 'closed' THEN 'Low Risk'
        ELSE 'Resolved'
      END as risk_level,
      COUNT(*) as count
    FROM findings
    GROUP BY 
      CASE 
        WHEN severity = 'critical' AND status != 'closed' THEN 'High Risk'
        WHEN severity = 'high' AND status != 'closed' THEN 'Medium Risk'
        WHEN severity IN ('medium', 'low') AND status != 'closed' THEN 'Low Risk'
        ELSE 'Resolved'
      END
  )
  SELECT 
    rd.risk_level,
    rd.count,
    ROUND(rd.count * 100.0 / SUM(rd.count) OVER (), 1) as percentage
  FROM risk_data rd
  ORDER BY 
    CASE rd.risk_level
      WHEN 'High Risk' THEN 1
      WHEN 'Medium Risk' THEN 2
      WHEN 'Low Risk' THEN 3
      WHEN 'Resolved' THEN 4
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix get_recent_activity function
CREATE OR REPLACE FUNCTION get_recent_activity(
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  activity_type TEXT,
  description TEXT,
  user_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  (
    SELECT 
      'Finding Created' as activity_type,
      'Created finding: ' || f.title as description,
      p.first_name || ' ' || p.last_name as user_name,
      f.created_at
    FROM findings f
    JOIN profiles p ON f.created_by = p.id
    ORDER BY f.created_at DESC
    LIMIT limit_count / 2
  )
  UNION ALL
  (
    SELECT 
      'Comment Added' as activity_type,
      'Commented on finding' as description,
      p.first_name || ' ' || p.last_name as user_name,
      c.created_at
    FROM comments c
    JOIN profiles p ON c.user_id = p.id
    ORDER BY c.created_at DESC
    LIMIT limit_count / 2
  )
  ORDER BY created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fix update_overdue_findings function
CREATE OR REPLACE FUNCTION update_overdue_findings()
RETURNS void AS $$
BEGIN
  UPDATE findings 
  SET status = 'overdue'
  WHERE due_date < CURRENT_TIMESTAMP 
    AND status NOT IN ('closed', 'overdue');
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =============================================================================
-- 4. OPTIMIZE RLS POLICIES FOR PERFORMANCE
-- =============================================================================

-- Drop existing policies that have performance issues
DROP POLICY IF EXISTS "Users can view projects they're assigned to" ON projects;
DROP POLICY IF EXISTS "Users can read assigned projects" ON projects;
DROP POLICY IF EXISTS "Admins have full access to projects" ON projects;
DROP POLICY IF EXISTS "Users can view findings in their projects" ON findings;
DROP POLICY IF EXISTS "Client safety managers can create findings" ON findings;
DROP POLICY IF EXISTS "Users can update findings they created or are assigned to" ON findings;
DROP POLICY IF EXISTS "Users can view evidence for findings in their projects" ON evidence;
DROP POLICY IF EXISTS "Users can upload evidence" ON evidence;
DROP POLICY IF EXISTS "Users can view comments for findings in their projects" ON comments;
DROP POLICY IF EXISTS "Users can create comments" ON comments;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

-- Create optimized RLS policies using subqueries to avoid re-evaluation

-- Projects RLS Policies - Fixed to properly restrict access
CREATE POLICY "Admins can access all projects" ON projects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

CREATE POLICY "Users can view projects they're assigned to" ON projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_assignments 
      WHERE project_id = projects.id AND user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Client managers can create projects" ON projects
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role IN ('client_safety_manager', 'client_project_manager')
      AND company = projects.client_company
    )
  );

CREATE POLICY "Client managers can update their company projects" ON projects
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role IN ('client_safety_manager', 'client_project_manager')
      AND company = projects.client_company
    )
  );

CREATE POLICY "Users can view findings in their projects" ON findings
  FOR SELECT USING (
    user_has_finding_access(id, (SELECT auth.uid()))
  );

CREATE POLICY "Client safety managers can create findings" ON findings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN projects proj ON p.company = proj.client_company
      WHERE p.id = (SELECT auth.uid())
      AND p.role = 'client_safety_manager'
      AND proj.id = findings.project_id
    )
  );

CREATE POLICY "Users can update findings they created or are assigned to" ON findings
  FOR UPDATE USING (
    created_by = (SELECT auth.uid()) OR 
    assigned_to = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid())
      AND role IN ('client_safety_manager', 'client_project_manager')
      AND user_has_finding_access(findings.id, (SELECT auth.uid()))
    )
  );

CREATE POLICY "Users can view evidence for findings in their projects" ON evidence
  FOR SELECT USING (
    user_has_finding_access(finding_id, (SELECT auth.uid()))
  );

CREATE POLICY "Users can upload evidence" ON evidence
  FOR INSERT WITH CHECK (
    user_has_finding_access(finding_id, (SELECT auth.uid()))
  );

CREATE POLICY "Users can view comments for findings in their projects" ON comments
  FOR SELECT USING (
    user_has_finding_access(finding_id, (SELECT auth.uid()))
  );

CREATE POLICY "Users can create comments" ON comments
  FOR INSERT WITH CHECK (
    user_has_finding_access(finding_id, (SELECT auth.uid())) AND
    user_id = (SELECT auth.uid())
  );

CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (user_id = (SELECT auth.uid()));

-- =============================================================================
-- 5. ADD MISSING RLS POLICIES FOR TABLES
-- =============================================================================

-- Add RLS policies for email_templates table
CREATE POLICY "Admins can manage email templates" ON email_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "Users can read email templates" ON email_templates
  FOR SELECT USING (true); -- Allow all authenticated users to read templates

-- =============================================================================
-- 6. REMOVE UNUSED INDEXES (Optional - commented out for safety)
-- =============================================================================

-- Uncomment these if you want to remove unused indexes
-- Note: These might be used in the future, so consider carefully

-- DROP INDEX IF EXISTS idx_findings_severity;
-- DROP INDEX IF EXISTS idx_notifications_is_read;
-- DROP INDEX IF EXISTS idx_evidence_is_photo;
-- DROP INDEX IF EXISTS idx_daily_analytics_summary_date;
-- DROP INDEX IF EXISTS idx_daily_analytics_summary_project;
-- DROP INDEX IF EXISTS idx_weekly_analytics_summary_week;

-- =============================================================================
-- 7. GRANT NECESSARY PERMISSIONS
-- =============================================================================

-- Grant usage on sequences if needed
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Grant execute permissions on functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

-- Log the completion
INSERT INTO audit_logs (table_name, record_id, action, new_values, user_id)
VALUES (
  'system',
  uuid_generate_v4(),
  'update',
  '{"migration": "database_security_fixes", "timestamp": "' || CURRENT_TIMESTAMP || '", "status": "completed"}',
  (SELECT auth.uid())
); 