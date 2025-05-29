import { Router } from 'express';
import {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  assignUserToProject
} from '../controllers/projectsController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// All project routes require authentication
router.use(authenticateToken);

// GET /api/projects - List all projects
router.get('/', getProjects);

// GET /api/projects/:id - Get specific project
router.get('/:id', getProject);

// POST /api/projects - Create new project (Admin, Client managers and GC project managers)
router.post('/', 
  requireRole(['admin', 'client_safety_manager', 'client_project_manager', 'gc_project_manager']), 
  createProject
);

// PUT /api/projects/:id - Update project (Admin, Client managers and GC project managers)
router.put('/:id', 
  requireRole(['admin', 'client_safety_manager', 'client_project_manager', 'gc_project_manager']), 
  updateProject
);

// DELETE /api/projects/:id - Delete project (Admin and Client safety managers)
router.delete('/:id', 
  requireRole(['admin', 'client_safety_manager']), 
  deleteProject
);

// POST /api/projects/:id/assign - Assign user to project (Admin, Client managers and GC project managers)
router.post('/:id/assign', 
  requireRole(['admin', 'client_safety_manager', 'client_project_manager', 'gc_project_manager']), 
  assignUserToProject
);

export default router; 