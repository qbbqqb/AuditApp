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

// POST /api/projects - Create new project (Client managers only)
router.post('/', 
  requireRole(['client_safety_manager', 'client_project_manager']), 
  createProject
);

// PUT /api/projects/:id - Update project (Client managers only)
router.put('/:id', 
  requireRole(['client_safety_manager', 'client_project_manager']), 
  updateProject
);

// DELETE /api/projects/:id - Delete project (Client safety managers only)
router.delete('/:id', 
  requireRole(['client_safety_manager']), 
  deleteProject
);

// POST /api/projects/:id/assign - Assign user to project (Client managers only)
router.post('/:id/assign', 
  requireRole(['client_safety_manager', 'client_project_manager']), 
  assignUserToProject
);

export default router; 