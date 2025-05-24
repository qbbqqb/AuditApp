import { Router } from 'express';
import {
  uploadEvidence,
  getEvidence,
  getEvidenceFile,
  downloadEvidence,
  deleteEvidence,
  upload
} from '../controllers/evidenceController';
import { authenticateToken } from '../middleware/auth';
import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';

const router = Router();

// Custom auth middleware for file serving that accepts token from query
const authenticateFileAccess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let token = req.headers.authorization?.replace('Bearer ', '');
    
    // If no header token, check query parameter
    if (!token && req.query.token) {
      token = req.query.token as string;
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'No token provided'
      });
      return;
    }

    // Verify token with Supabase (same as main auth middleware)
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
      return;
    }

    // Get user profile from our database
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      res.status(401).json({
        success: false,
        message: 'User profile not found'
      });
      return;
    }

    // Add user to request object
    (req as any).user = profile;
    next();
  } catch (error) {
    console.error('File auth error:', error);
    res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// All evidence routes require authentication except file serving (which uses custom middleware)
router.use(authenticateToken);

// GET /api/evidence/finding/:finding_id - Get all evidence for a finding
router.get('/finding/:finding_id', getEvidence);

// POST /api/evidence/finding/:finding_id - Upload evidence for a finding
router.post('/finding/:finding_id', upload.single('file') as any, uploadEvidence);

// GET /api/evidence/:id/download - Download specific evidence file
router.get('/:id/download', downloadEvidence);

// DELETE /api/evidence/:id - Delete evidence
router.delete('/:id', deleteEvidence);

// GET /api/evidence/:id/file - Serve evidence file (for display) - uses custom auth
router.get('/:id/file', authenticateFileAccess, getEvidenceFile);

export default router; 