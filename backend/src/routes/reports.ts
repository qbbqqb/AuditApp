import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { previewReport, generateReport } from '../controllers/reportsController';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// POST /api/reports/preview - Generate report preview
router.post('/preview', previewReport);

// POST /api/reports/generate - Generate and download report
router.post('/generate', generateReport);

export default router; 