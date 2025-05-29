import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

// Extend Request interface to include file and user
interface MulterRequest extends Request {
  file?: Express.Multer.File;
  user?: any;
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/evidence';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  // Log all file upload attempts for debugging
  console.log(`File upload attempt: ${file.originalname}, MIME: ${file.mimetype}, Extension: ${path.extname(file.originalname)}`);
  
  // Allowed file types - prioritizing images for observation photos
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|mp4|mov|avi|mp3|wav|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  
  // More comprehensive MIME type checking
  const allowedMimeTypes = [
    // Images
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    // Excel files
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    // Videos
    'video/mp4', 'video/quicktime', 'video/x-msvideo',
    // Audio
    'audio/mpeg', 'audio/wav', 'audio/mp3'
  ];
  
  const mimetypeAllowed = allowedMimeTypes.includes(file.mimetype) ||
                         file.mimetype.startsWith('image/') ||
                         file.mimetype.startsWith('video/') ||
                         file.mimetype.startsWith('audio/');

  console.log(`Extension allowed: ${extname}, MIME allowed: ${mimetypeAllowed}`);

  if (mimetypeAllowed && extname) {
    console.log(`✅ File accepted: ${file.originalname}`);
    return cb(null, true);
  } else {
    console.log(`❌ Rejected file: ${file.originalname}, MIME: ${file.mimetype}, Extension: ${path.extname(file.originalname)}`);
    cb(new Error(`Invalid file type: ${file.mimetype}. Only images, documents (PDF, DOC, DOCX, XLS, XLSX), videos, and audio files are allowed.`));
  }
};

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB default
  },
  fileFilter: fileFilter
});

// Helper function to create thumbnail for images
const createThumbnail = async (filePath: string): Promise<string | null> => {
  try {
    const ext = path.extname(filePath);
    const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext.toLowerCase());
    
    if (!isImage) {
      return null;
    }

    const thumbnailPath = filePath.replace(ext, `_thumb${ext}`);
    
    await sharp(filePath)
      .resize(300, 300, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);
      
    return thumbnailPath;
  } catch (error) {
    console.error('Error creating thumbnail:', error);
    return null;
  }
};

export const uploadEvidence = async (req: MulterRequest, res: Response): Promise<void> => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Clean up uploaded file if validation fails
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(400).json({
        success: false,
        message: 'Invalid parameters',
        errors: errors.array()
      });
      return;
    }

    console.log('📤 Upload evidence request received');
    console.log('User:', req.user ? `${req.user.id} (${req.user.role})` : 'Not authenticated');
    console.log('File:', req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'No file');
    console.log('Body:', req.body);

    if (!req.user) {
      console.log('❌ Authentication failed');
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    if (!req.file) {
      console.log('❌ No file in request');
      res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
      return;
    }

    const { finding_id } = req.params;
    const { description, is_corrective_action } = req.body;

    // Verify finding exists and user has access
    const { data: finding, error: findingError } = await supabaseAdmin
      .from('findings')
      .select('id, created_by, assigned_to, project_id')
      .eq('id', finding_id)
      .single();

    if (findingError || !finding) {
      // Clean up uploaded file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(404).json({
        success: false,
        message: 'Finding not found'
      });
      return;
    }

    // Check if user can upload evidence (creator, assignee, or safety manager)
    const canUpload = 
      req.user.id === finding.created_by ||
      req.user.id === finding.assigned_to ||
      req.user.role === 'client_safety_manager' ||
      req.user.role === 'gc_ehs_officer';

    if (!canUpload) {
      // Clean up uploaded file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(403).json({
        success: false,
        message: 'You do not have permission to upload evidence for this finding'
      });
      return;
    }

    // Create thumbnail if it's an image
    const thumbnailPath = await createThumbnail(req.file.path);

    // Determine if this is a photo (for inline display)
    const isPhoto = req.file.mimetype.startsWith('image/');

    // Save evidence record to database
    console.log('💾 Saving evidence to database...');
    
    // Truncate description to fit database constraint if needed
    const truncatedDescription = description && description.length > 50 
      ? description.substring(0, 47) + '...' 
      : description;
    
    // Truncate file_type to fit database constraint (50 characters max)
    const truncatedFileType = req.file.mimetype.length > 50 
      ? req.file.mimetype.substring(0, 50) 
      : req.file.mimetype;
    
    // Truncate file_name to fit database constraint if needed (255 characters max typically)
    const truncatedFileName = req.file.originalname.length > 255 
      ? req.file.originalname.substring(0, 252) + '...' 
      : req.file.originalname;
    
    const evidenceData = {
      finding_id,
      uploaded_by: req.user.id,
      file_name: truncatedFileName,
      file_path: req.file.path,
      file_type: truncatedFileType,
      file_size: req.file.size,
      description: truncatedDescription || null,
      is_corrective_action: is_corrective_action === 'true',
      thumbnail_path: thumbnailPath,
      is_photo: isPhoto
    };
    console.log('Evidence data:', evidenceData);

    const { data: evidence, error } = await supabaseAdmin
      .from('evidence')
      .insert(evidenceData)
      .select(`
        *,
        uploaded_by_profile:profiles!evidence_uploaded_by_fkey(first_name, last_name, role)
      `)
      .single();

    if (error) {
      console.log('❌ Database error:', error);
      // Clean up uploaded files
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      if (thumbnailPath && fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
      }
      
      res.status(400).json({
        success: false,
        message: 'Failed to save evidence record',
        error: error.message
      });
      return;
    }

    console.log('✅ Evidence saved successfully:', evidence.id);

    res.status(201).json({
      success: true,
      data: evidence,
      message: 'Evidence uploaded successfully'
    });
  } catch (error) {
    console.error('❌ Upload evidence error:', error);
    
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getEvidence = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Invalid parameters',
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

    const { finding_id } = req.params;
    const { type } = req.query; // Optional filter: 'photos', 'documents', 'all'

    let query = supabaseAdmin
      .from('evidence')
      .select(`
        *,
        uploaded_by_profile:profiles!evidence_uploaded_by_fkey(first_name, last_name, role, company)
      `)
      .eq('finding_id', finding_id);

    // Apply type filter
    if (type === 'photos') {
      query = query.eq('is_photo', true);
    } else if (type === 'documents') {
      query = query.eq('is_photo', false);
    }

    const { data: evidence, error } = await query.order('created_at', { ascending: false });

    if (error) {
      res.status(400).json({
        success: false,
        message: 'Failed to fetch evidence',
        error: error.message
      });
      return;
    }

    res.json({
      success: true,
      data: evidence || [],
      message: 'Evidence retrieved successfully'
    });
  } catch (error) {
    console.error('Get evidence error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getEvidenceFile = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Invalid parameters',
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
    const { thumbnail } = req.query;

    // Get evidence record
    const { data: evidence, error } = await supabaseAdmin
      .from('evidence')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !evidence) {
      res.status(404).json({
        success: false,
        message: 'Evidence not found'
      });
      return;
    }

    // Determine which file to serve
    const filePath = thumbnail === 'true' && evidence.thumbnail_path 
      ? evidence.thumbnail_path 
      : evidence.file_path;

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
      return;
    }

    // Set appropriate headers
    const fileName = thumbnail === 'true' ? `thumb_${evidence.file_name}` : evidence.file_name;
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.setHeader('Content-Type', evidence.file_type);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Get evidence file error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const downloadEvidence = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Invalid parameters',
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

    // Get evidence record
    const { data: evidence, error } = await supabaseAdmin
      .from('evidence')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !evidence) {
      res.status(404).json({
        success: false,
        message: 'Evidence not found'
      });
      return;
    }

    // Check if file exists
    if (!fs.existsSync(evidence.file_path)) {
      res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
      return;
    }

    // Set download headers
    res.setHeader('Content-Disposition', `attachment; filename="${evidence.file_name}"`);
    res.setHeader('Content-Type', evidence.file_type);
    res.setHeader('Content-Length', evidence.file_size.toString());

    // Stream the file
    const fileStream = fs.createReadStream(evidence.file_path);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Download evidence error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const deleteEvidence = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Invalid parameters',
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

    // Get evidence record
    const { data: evidence, error: fetchError } = await supabaseAdmin
      .from('evidence')
      .select('*, finding:findings(created_by)')
      .eq('id', id)
      .single();

    if (fetchError || !evidence) {
      res.status(404).json({
        success: false,
        message: 'Evidence not found'
      });
      return;
    }

    // Check permissions (uploader, finding creator, or safety manager)
    const canDelete = 
      req.user.id === evidence.uploaded_by ||
      req.user.id === evidence.finding.created_by ||
      req.user.role === 'client_safety_manager';

    if (!canDelete) {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this evidence'
      });
      return;
    }

    // Delete from database
    const { error } = await supabaseAdmin
      .from('evidence')
      .delete()
      .eq('id', id);

    if (error) {
      res.status(400).json({
        success: false,
        message: 'Failed to delete evidence record',
        error: error.message
      });
      return;
    }

    // Delete files from filesystem
    try {
      if (fs.existsSync(evidence.file_path)) {
        fs.unlinkSync(evidence.file_path);
      }
      if (evidence.thumbnail_path && fs.existsSync(evidence.thumbnail_path)) {
        fs.unlinkSync(evidence.thumbnail_path);
      }
    } catch (fileError) {
      console.error('Error deleting files:', fileError);
      // Continue - database record is already deleted
    }

    res.json({
      success: true,
      message: 'Evidence deleted successfully'
    });
  } catch (error) {
    console.error('Delete evidence error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}; 