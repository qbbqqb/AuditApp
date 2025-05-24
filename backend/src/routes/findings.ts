import { Router } from 'express';
import {
  createFinding,
  getFindings,
  getFinding,
  updateFinding,
  addComment
} from '../controllers/findingsController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validateFinding, validateComment } from '../middleware/validation';

const router = Router();

// All findings routes require authentication
router.use(authenticateToken);

// GET /api/findings - List all findings with filters and pagination
router.get('/', getFindings);

// GET /api/findings/:id - Get specific finding with details
router.get('/:id', getFinding);

// POST /api/findings - Create new finding (Client Safety Managers only)
router.post('/', 
  requireRole(['client_safety_manager']), 
  validateFinding, 
  createFinding
);

// PUT /api/findings/:id - Update finding
router.put('/:id', updateFinding);

// POST /api/findings/:id/comments - Add comment to finding
router.post('/:id/comments', validateComment, addComment);

export default router; 