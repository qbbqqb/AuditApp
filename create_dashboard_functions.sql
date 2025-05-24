-- First, ensure UUID extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Helper function to check if user has access to finding (required by get_dashboard_metrics)
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