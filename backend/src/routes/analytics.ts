import { Router } from 'express';
import {
  getDashboardMetrics,
  getTrendData,
  getProjectHealth,
  getOverdueItems
} from '../controllers/analyticsController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All analytics routes require authentication
router.use(authenticateToken);

// GET /api/analytics/dashboard - Get main dashboard metrics
router.get('/dashboard', getDashboardMetrics as any);

// GET /api/analytics/trends - Get trend data for charts
router.get('/trends', getTrendData as any);

// GET /api/analytics/projects - Get project health data
router.get('/projects', getProjectHealth as any);

// GET /api/analytics/overdue - Get detailed overdue items
router.get('/overdue', getOverdueItems as any);

export default router; 