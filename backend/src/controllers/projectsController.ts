import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { validationResult } from 'express-validator';
import { ApiResponse, Project } from '../types';

export const createProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
      return;
    }

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    // Only client safety managers and project managers can create projects
    if (!['client_safety_manager', 'client_project_manager'].includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Only Client Safety Managers and Project Managers can create projects'
      });
      return;
    }

    const {
      name,
      description,
      client_company,
      contractor_company,
      start_date,
      end_date
    } = req.body;

    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .insert({
        name,
        description,
        client_company,
        contractor_company,
        start_date,
        end_date
      })
      .select()
      .single();

    if (error) {
      res.status(400).json({
        success: false,
        message: 'Failed to create project',
        error: error.message
      });
      return;
    }

    // Auto-assign the creator to the project
    await supabaseAdmin
      .from('project_assignments')
      .insert({
        project_id: project.id,
        user_id: req.user.id
      });

    const response: ApiResponse<Project> = {
      success: true,
      data: project as Project,
      message: 'Project created successfully'
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getProjects = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    // Development mode fallback
    if (process.env.NODE_ENV === 'development' && req.user.id === 'dev-admin-id') {
      const mockProjects = [
        {
          id: 'project-1',
          name: 'Construction Site Alpha',
          description: 'Multi-story commercial building construction',
          client_company: 'ABC Corp',
          contractor_company: 'XYZ Builders',
          start_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
          is_active: true,
          created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
          assignments: [
            {
              user_id: 'dev-admin-id',
              assigned_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
              user: {
                first_name: 'Admin',
                last_name: 'User',
                role: 'CLIENT_SAFETY_MANAGER',
                company: 'Development Company'
              }
            }
          ],
          findings_count: [{ count: 8 }]
        },
        {
          id: 'project-2',
          name: 'Office Building Beta',
          description: 'Corporate headquarters renovation',
          client_company: 'DEF Inc',
          contractor_company: 'GHI Construction',
          start_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString(),
          is_active: true,
          created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          assignments: [
            {
              user_id: 'dev-admin-id',
              assigned_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
              user: {
                first_name: 'Admin',
                last_name: 'User',
                role: 'CLIENT_SAFETY_MANAGER',
                company: 'Development Company'
              }
            }
          ],
          findings_count: [{ count: 5 }]
        },
        {
          id: 'project-3',
          name: 'Industrial Complex Gamma',
          description: 'Manufacturing facility expansion',
          client_company: 'JKL Manufacturing',
          contractor_company: 'MNO Industrial',
          start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date(Date.now() + 270 * 24 * 60 * 60 * 1000).toISOString(),
          is_active: true,
          created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          assignments: [
            {
              user_id: 'dev-admin-id',
              assigned_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
              user: {
                first_name: 'Admin',
                last_name: 'User',
                role: 'CLIENT_SAFETY_MANAGER',
                company: 'Development Company'
              }
            }
          ],
          findings_count: [{ count: 12 }]
        }
      ];

      const { page = 1, limit = 20 } = req.query;
      const response: ApiResponse<Project[]> = {
        success: true,
        data: mockProjects as Project[],
        message: 'Projects retrieved successfully (development mode)',
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: mockProjects.length,
          totalPages: Math.ceil(mockProjects.length / Number(limit))
        }
      };

      res.json(response);
      return;
    }

    const {
      page = 1,
      limit = 20,
      is_active = 'true'
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    let query = supabaseAdmin
      .from('projects')
      .select(`
        *,
        assignments:project_assignments(
          user_id,
          assigned_at,
          user:profiles(first_name, last_name, role, company)
        ),
        findings_count:findings(count)
      `, { count: 'exact' });

    // Filter by active status
    if (is_active !== 'all') {
      query = query.eq('is_active', is_active === 'true');
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    const { data: projects, error, count } = await query;

    if (error) {
      res.status(400).json({
        success: false,
        message: 'Failed to fetch projects',
        error: error.message
      });
      return;
    }

    const response: ApiResponse<Project[]> = {
      success: true,
      data: projects as Project[],
      message: 'Projects retrieved successfully',
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / Number(limit))
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getProject = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const { id } = req.params;

    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .select(`
        *,
        assignments:project_assignments(
          user_id,
          assigned_at,
          user:profiles(first_name, last_name, role, company, email)
        ),
        findings:findings(
          id, title, severity, status, created_at, due_date,
          created_by_profile:profiles!findings_created_by_fkey(first_name, last_name),
          assigned_to_profile:profiles!findings_assigned_to_fkey(first_name, last_name)
        )
      `)
      .eq('id', id)
      .single();

    if (error || !project) {
      res.status(404).json({
        success: false,
        message: 'Project not found'
      });
      return;
    }

    const response: ApiResponse<Project> = {
      success: true,
      data: project as Project,
      message: 'Project retrieved successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const updateProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
      return;
    }

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    // Only client managers can update projects
    if (!['client_safety_manager', 'client_project_manager'].includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Only Client Safety Managers and Project Managers can update projects'
      });
      return;
    }

    const { id } = req.params;
    const updateData = req.body;

    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      res.status(400).json({
        success: false,
        message: 'Failed to update project',
        error: error.message
      });
      return;
    }

    const response: ApiResponse<Project> = {
      success: true,
      data: project as Project,
      message: 'Project updated successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const assignUserToProject = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    // Only client managers can assign users to projects
    if (!['client_safety_manager', 'client_project_manager'].includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Only Client Safety Managers and Project Managers can assign users to projects'
      });
      return;
    }

    const { id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
      return;
    }

    // Check if project exists
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('id', id)
      .single();

    if (projectError || !project) {
      res.status(404).json({
        success: false,
        message: 'Project not found'
      });
      return;
    }

    // Check if user exists
    const { data: user, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('id', user_id)
      .single();

    if (userError || !user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Assign user to project (insert or ignore if already assigned)
    const { data: assignment, error } = await supabaseAdmin
      .from('project_assignments')
      .upsert({
        project_id: id,
        user_id
      })
      .select()
      .single();

    if (error) {
      res.status(400).json({
        success: false,
        message: 'Failed to assign user to project',
        error: error.message
      });
      return;
    }

    res.json({
      success: true,
      data: assignment,
      message: `User ${user.first_name} ${user.last_name} assigned to project successfully`
    });
  } catch (error) {
    console.error('Assign user to project error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}; 