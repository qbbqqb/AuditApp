import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { CreateFindingRequest, UpdateFindingRequest, ApiResponse, Finding, AddCommentRequest } from '../types';
import { validationResult } from 'express-validator';

export const createFinding = async (req: Request, res: Response): Promise<void> => {
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

    // Only client safety managers can create findings
    if (req.user.role !== 'client_safety_manager') {
      res.status(403).json({
        success: false,
        message: 'Only Client Safety Managers can create findings'
      });
      return;
    }

    const findingData: CreateFindingRequest = req.body;

    // Set default due date if not provided (14 days from now)
    const dueDate = findingData.due_date 
      ? new Date(findingData.due_date) 
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const { data: finding, error } = await supabaseAdmin
      .from('findings')
      .insert({
        title: findingData.title,
        description: findingData.description,
        location: findingData.location,
        severity: findingData.severity,
        category: findingData.category,
        project_id: findingData.project_id,
        created_by: req.user.id,
        assigned_to: findingData.assigned_to,
        due_date: dueDate.toISOString(),
        regulatory_reference: findingData.regulatory_reference,
        immediate_action_required: findingData.immediate_action_required || false
      })
      .select(`
        *,
        created_by_profile:profiles!findings_created_by_fkey(first_name, last_name, email, role),
        assigned_to_profile:profiles!findings_assigned_to_fkey(first_name, last_name, email, role),
        project:projects(name, client_company, contractor_company)
      `)
      .single();

    if (error) {
      res.status(400).json({
        success: false,
        message: 'Failed to create finding',
        error: error.message
      });
      return;
    }

    // TODO: Send notification to assigned user
    // TODO: Create audit log entry

    const response: ApiResponse<Finding> = {
      success: true,
      data: finding as Finding,
      message: 'Finding created successfully'
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Create finding error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getFindings = async (req: Request, res: Response): Promise<void> => {
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
      const mockFindings = [
        {
          id: 'finding-1',
          title: 'Missing Safety Barriers',
          description: 'Construction area lacks proper safety barriers around excavation site',
          location: 'Site A - North Wing',
          severity: 'high',
          category: 'FALL_PROTECTION',
          status: 'open',
          project_id: 'project-1',
          created_by: 'dev-admin-id',
          assigned_to: 'user-1',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          regulatory_reference: 'OSHA 1926.502',
          immediate_action_required: true,
          created_by_profile: {
            first_name: 'Admin',
            last_name: 'User',
            email: 'admin@example.com',
            role: 'CLIENT_SAFETY_MANAGER'
          },
          assigned_to_profile: {
            first_name: 'John',
            last_name: 'Smith',
            email: 'john@example.com',
            role: 'EHS_OFFICER'
          },
          project: {
            name: 'Construction Site Alpha',
            client_company: 'ABC Corp',
            contractor_company: 'XYZ Builders'
          },
          evidence_count: [{ count: 3 }]
        },
        {
          id: 'finding-2',
          title: 'Improper Ladder Setup',
          description: 'Extension ladder not secured at proper angle',
          location: 'Building B - Roof Access',
          severity: 'medium',
          category: 'LADDER_SAFETY',
          status: 'completed_pending_approval',
          project_id: 'project-2',
          created_by: 'dev-admin-id',
          assigned_to: 'user-2',
          due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          regulatory_reference: 'OSHA 1926.1053',
          immediate_action_required: false,
          created_by_profile: {
            first_name: 'Admin',
            last_name: 'User',
            email: 'admin@example.com',
            role: 'CLIENT_SAFETY_MANAGER'
          },
          assigned_to_profile: {
            first_name: 'Jane',
            last_name: 'Doe',
            email: 'jane@example.com',
            role: 'EHS_OFFICER'
          },
          project: {
            name: 'Office Building Beta',
            client_company: 'DEF Inc',
            contractor_company: 'GHI Construction'
          },
          evidence_count: [{ count: 2 }]
        }
      ];

      const { page = 1, limit = 20 } = req.query;
      const response: ApiResponse<Finding[]> = {
        success: true,
        data: mockFindings as Finding[],
        message: 'Findings retrieved successfully (development mode)',
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: mockFindings.length,
          totalPages: Math.ceil(mockFindings.length / Number(limit))
        }
      };

      res.json(response);
      return;
    }

    const {
      page = 1,
      limit = 20,
      status,
      severity,
      category,
      project_id,
      assigned_to,
      created_by
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    let query = supabaseAdmin
      .from('findings')
      .select(`
        *,
        created_by_profile:profiles!findings_created_by_fkey(first_name, last_name, email, role),
        assigned_to_profile:profiles!findings_assigned_to_fkey(first_name, last_name, email, role),
        project:projects(name, client_company, contractor_company),
        evidence_count:evidence(count)
      `, { count: 'exact' });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (severity) {
      query = query.eq('severity', severity);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (project_id) {
      query = query.eq('project_id', project_id);
    }
    if (assigned_to) {
      query = query.eq('assigned_to', assigned_to);
    }
    if (created_by) {
      query = query.eq('created_by', created_by);
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    const { data: findings, error, count } = await query;

    if (error) {
      res.status(400).json({
        success: false,
        message: 'Failed to fetch findings',
        error: error.message
      });
      return;
    }

    const response: ApiResponse<Finding[]> = {
      success: true,
      data: findings as Finding[],
      message: 'Findings retrieved successfully',
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / Number(limit))
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Get findings error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getFinding = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const { id } = req.params;

    // Development mode fallback
    if (process.env.NODE_ENV === 'development' && req.user.id === 'dev-admin-id') {
      const mockFindings = {
        'finding-1': {
          id: 'finding-1',
          title: 'Missing Safety Barriers',
          description: 'Construction area lacks proper safety barriers around excavation site',
          location: 'Site A - North Wing',
          severity: 'high',
          category: 'FALL_PROTECTION',
          status: 'open',
          project_id: 'project-1',
          created_by: 'dev-admin-id',
          assigned_to: 'user-1',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          regulatory_reference: 'OSHA 1926.502',
          immediate_action_required: true,
          created_by_profile: {
            first_name: 'Admin',
            last_name: 'User',
            email: 'admin@example.com',
            role: 'CLIENT_SAFETY_MANAGER'
          },
          assigned_to_profile: {
            first_name: 'John',
            last_name: 'Smith',
            email: 'john@example.com',
            role: 'EHS_OFFICER'
          },
          project: {
            name: 'Construction Site Alpha',
            client_company: 'ABC Corp',
            contractor_company: 'XYZ Builders'
          },
          evidence: [
            {
              id: 'evidence-1',
              finding_id: 'finding-1',
              file_name: 'barrier_issue.jpg',
              file_type: 'image/jpeg',
              file_size: 1024000,
              uploaded_by: 'user-1',
              uploaded_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
              description: 'Photo showing missing barriers',
              is_corrective_action: false,
              is_photo: true
            }
          ],
          comments: [
            {
              id: 'comment-1',
              finding_id: 'finding-1',
              user_id: 'user-1',
              content: 'Will address this immediately. Installing temporary barriers.',
              is_internal: false,
              created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
              user: {
                first_name: 'John',
                last_name: 'Smith',
                role: 'EHS_OFFICER'
              }
            }
          ]
        },
        'finding-2': {
          id: 'finding-2',
          title: 'Improper Ladder Setup',
          description: 'Extension ladder not secured at proper angle',
          location: 'Building B - Roof Access',
          severity: 'medium',
          category: 'LADDER_SAFETY',
          status: 'completed_pending_approval',
          project_id: 'project-2',
          created_by: 'dev-admin-id',
          assigned_to: 'user-2',
          due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          regulatory_reference: 'OSHA 1926.1053',
          immediate_action_required: false,
          created_by_profile: {
            first_name: 'Admin',
            last_name: 'User',
            email: 'admin@example.com',
            role: 'CLIENT_SAFETY_MANAGER'
          },
          assigned_to_profile: {
            first_name: 'Jane',
            last_name: 'Doe',
            email: 'jane@example.com',
            role: 'EHS_OFFICER'
          },
          project: {
            name: 'Office Building Beta',
            client_company: 'DEF Inc',
            contractor_company: 'GHI Construction'
          },
          evidence: [
            {
              id: 'evidence-2',
              finding_id: 'finding-2',
              file_name: 'ladder_fixed.jpg',
              file_type: 'image/jpeg',
              file_size: 890000,
              uploaded_by: 'user-2',
              uploaded_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
              description: 'Corrective action - ladder properly secured',
              is_corrective_action: true,
              is_photo: true
            },
            {
              id: 'evidence-3',
              finding_id: 'finding-2',
              file_name: 'completion_report.pdf',
              file_type: 'application/pdf',
              file_size: 234000,
              uploaded_by: 'user-2',
              uploaded_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
              description: 'Completion report with safety checklist',
              is_corrective_action: true,
              is_photo: false
            }
          ],
          comments: [
            {
              id: 'comment-2',
              finding_id: 'finding-2',
              user_id: 'user-2',
              content: 'Ladder has been repositioned and secured. Uploading completion photos.',
              is_internal: false,
              created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
              user: {
                first_name: 'Jane',
                last_name: 'Doe',
                role: 'EHS_OFFICER'
              }
            },
            {
              id: 'comment-3',
              finding_id: 'finding-2',
              user_id: 'user-2',
              content: 'Evidence uploaded and ready for review. Requesting approval to close.',
              is_internal: false,
              created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
              user: {
                first_name: 'Jane',
                last_name: 'Doe',
                role: 'EHS_OFFICER'
              }
            }
          ]
        }
      };

      const finding = mockFindings[id as keyof typeof mockFindings];
      
      if (!finding) {
        res.status(404).json({
          success: false,
          message: 'Finding not found'
        });
        return;
      }

      const response: ApiResponse<Finding> = {
        success: true,
        data: finding as Finding,
        message: 'Finding retrieved successfully (development mode)'
      };

      res.json(response);
      return;
    }

    const { data: finding, error } = await supabaseAdmin
      .from('findings')
      .select(`
        *,
        created_by_profile:profiles!findings_created_by_fkey(first_name, last_name, email, role),
        assigned_to_profile:profiles!findings_assigned_to_fkey(first_name, last_name, email, role),
        project:projects(name, client_company, contractor_company),
        evidence(*),
        comments(*, user:profiles(first_name, last_name, role))
      `)
      .eq('id', id)
      .single();

    if (error || !finding) {
      res.status(404).json({
        success: false,
        message: 'Finding not found'
      });
      return;
    }

    const response: ApiResponse<Finding> = {
      success: true,
      data: finding as Finding,
      message: 'Finding retrieved successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Get finding error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const updateFinding = async (req: Request, res: Response): Promise<void> => {
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

    const { id } = req.params;
    const updateData: UpdateFindingRequest = req.body;

    // Get current finding to check permissions
    const { data: currentFinding, error: fetchError } = await supabaseAdmin
      .from('findings')
      .select('created_by, assigned_to, status')
      .eq('id', id)
      .single();

    if (fetchError || !currentFinding) {
      res.status(404).json({
        success: false,
        message: 'Finding not found'
      });
      return;
    }

    // Check permissions
    const canUpdate = 
      req.user.id === currentFinding.created_by || // Creator can update
      req.user.id === currentFinding.assigned_to || // Assignee can update
      req.user.role === 'client_safety_manager' || // Safety managers can update
      req.user.role === 'client_project_manager' || // Project managers can update
      req.user.role === 'gc_ehs_officer'; // GC EHS officers can update for evidence workflow

    if (!canUpdate) {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to update this finding'
      });
      return;
    }

    // If status is being changed to closed, set closed_at timestamp
    const updateFields = { ...updateData };
    if (updateData.status === 'closed' && currentFinding.status !== 'closed') {
      updateFields.closed_at = new Date().toISOString();
    }

    const { data: finding, error } = await supabaseAdmin
      .from('findings')
      .update(updateFields)
      .eq('id', id)
      .select(`
        *,
        created_by_profile:profiles!findings_created_by_fkey(first_name, last_name, email, role),
        assigned_to_profile:profiles!findings_assigned_to_fkey(first_name, last_name, email, role),
        project:projects(name, client_company, contractor_company)
      `)
      .single();

    if (error) {
      res.status(400).json({
        success: false,
        message: 'Failed to update finding',
        error: error.message
      });
      return;
    }

    // TODO: Send notification if status changed
    // TODO: Create audit log entry

    const response: ApiResponse<Finding> = {
      success: true,
      data: finding as Finding,
      message: 'Finding updated successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Update finding error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const addComment = async (req: Request, res: Response): Promise<void> => {
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

    const { id } = req.params;
    const commentData: AddCommentRequest = req.body;

    // Verify finding exists
    const { data: finding, error: findingError } = await supabaseAdmin
      .from('findings')
      .select('id')
      .eq('id', id)
      .single();

    if (findingError || !finding) {
      res.status(404).json({
        success: false,
        message: 'Finding not found'
      });
      return;
    }

    const { data: comment, error } = await supabaseAdmin
      .from('comments')
      .insert({
        finding_id: id,
        user_id: req.user.id,
        content: commentData.content,
        is_internal: commentData.is_internal || false
      })
      .select(`
        *,
        user:profiles(first_name, last_name, role)
      `)
      .single();

    if (error) {
      res.status(400).json({
        success: false,
        message: 'Failed to add comment',
        error: error.message
      });
      return;
    }

    // TODO: Send notification to relevant users
    // TODO: Create audit log entry

    const response: ApiResponse = {
      success: true,
      data: comment,
      message: 'Comment added successfully'
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}; 