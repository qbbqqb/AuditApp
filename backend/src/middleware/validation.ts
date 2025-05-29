import { body, param } from 'express-validator';

export const validateRegistration = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('first_name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  
  body('last_name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  
  body('role')
    .isIn(['client_safety_manager', 'client_project_manager', 'gc_ehs_officer', 'gc_project_manager', 'gc_site_director'])
    .withMessage('Please provide a valid role'),
  
  body('company')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Company name must be between 2 and 100 characters'),
  
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number')
];

export const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

export const validateProfileUpdate = [
  body('first_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  
  body('last_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number')
];

export const validateFinding = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage('Title must be between 5 and 255 characters'),
  
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  
  body('location')
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage('Location must be between 3 and 255 characters'),
  
  body('severity')
    .isIn(['critical', 'high', 'medium', 'low'])
    .withMessage('Please provide a valid severity level'),
  
  body('category')
    .isIn([
      'fall_protection', 'electrical_safety', 'ppe_compliance', 
      'housekeeping', 'equipment_safety', 'environmental', 
      'fire_safety', 'confined_space', 'chemical_safety', 'other'
    ])
    .withMessage('Please provide a valid category'),
  
  body('project_id')
    .isUUID()
    .withMessage('Please provide a valid project ID'),
  
  body('assigned_to')
    .optional()
    .isUUID()
    .withMessage('Please provide a valid assignee ID'),
  
  body('due_date')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid due date'),
  
  body('regulatory_reference')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Regulatory reference must be less than 500 characters'),
  
  body('immediate_action_required')
    .optional()
    .isBoolean()
    .withMessage('Immediate action required must be a boolean value')
];

export const validateComment = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment must be between 1 and 1000 characters'),
  
  body('is_internal')
    .optional()
    .isBoolean()
    .withMessage('Is internal must be a boolean value')
];

// Evidence validation
export const validateFindingId = [
  param('finding_id')
    .isUUID()
    .withMessage('Please provide a valid finding ID')
];

export const validateEvidenceId = [
  param('id')
    .isUUID()
    .withMessage('Please provide a valid evidence ID')
];

export const validateProjectId = [
  param('id')
    .isUUID()
    .withMessage('Please provide a valid project ID')
]; 