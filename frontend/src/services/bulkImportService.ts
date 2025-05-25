import { supabase } from '../config/supabase';
import * as XLSX from 'xlsx';

export interface ImportFinding {
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  category: string;
  location: string;
  due_date?: string;
  assigned_to_email?: string;
  project_name?: string;
  status?: 'open' | 'in_progress' | 'resolved' | 'closed';
  immediate_action_required?: boolean;
  regulatory_requirement?: string;
  potential_consequences?: string;
  recommended_actions?: string;
}

export interface ImportResult {
  success: boolean;
  total_processed: number;
  successful_imports: number;
  failed_imports: number;
  errors: ImportError[];
  created_findings: string[]; // Finding IDs
}

export interface ImportError {
  row: number;
  field?: string;
  message: string;
  data?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ImportError[];
  warnings: ImportError[];
}

export class BulkImportService {
  
  /**
   * Generate CSV template for bulk import
   */
  static generateTemplate(): string {
    const headers = [
      'title',
      'description', 
      'severity',
      'category',
      'location',
      'due_date',
      'assigned_to_email',
      'project_name',
      'status',
      'immediate_action_required',
      'regulatory_requirement',
      'potential_consequences',
      'recommended_actions'
    ];

    const sampleData = [
      'Unsafe ladder placement',
      'Ladder not properly secured against wall, creating fall hazard',
      'high',
      'Fall Protection',
      'Building A - 2nd Floor',
      '2024-02-15',
      'john.doe@company.com',
      'Office Renovation Project',
      'open',
      'true',
      'OSHA 1926.1053',
      'Potential fall injury, regulatory violation',
      'Secure ladder properly, provide spotter, consider alternative access method'
    ];

    return [headers.join(','), sampleData.join(',')].join('\n');
  }

  /**
   * Parse uploaded file (CSV or Excel)
   */
  static async parseFile(file: File): Promise<ImportFinding[]> {
    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      
      if (fileExtension === 'csv') {
        return this.parseCSV(file);
      } else if (['xlsx', 'xls'].includes(fileExtension || '')) {
        return this.parseExcel(file);
      } else {
        throw new Error('Unsupported file format. Please use CSV or Excel files.');
      }
    } catch (error) {
      console.error('Error parsing file:', error);
      throw error;
    }
  }

  /**
   * Parse CSV file
   */
  private static async parseCSV(file: File): Promise<ImportFinding[]> {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('File must contain at least a header row and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const findings: ImportFinding[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length === 0) continue; // Skip empty lines
      
      const finding: any = {};
      headers.forEach((header, index) => {
        if (values[index] !== undefined) {
          finding[header] = values[index].trim();
        }
      });

      findings.push(this.normalizeImportFinding(finding));
    }

    return findings;
  }

  /**
   * Parse Excel file
   */
  private static async parseExcel(file: File): Promise<ImportFinding[]> {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length < 2) {
      throw new Error('File must contain at least a header row and one data row');
    }

    const headers = (jsonData[0] as string[]).map(h => h?.toString().trim() || '');
    const findings: ImportFinding[] = [];

    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i] as any[];
      if (!row || row.every(cell => !cell)) continue; // Skip empty rows
      
      const finding: any = {};
      headers.forEach((header, index) => {
        if (row[index] !== undefined && row[index] !== null) {
          finding[header] = row[index].toString().trim();
        }
      });

      findings.push(this.normalizeImportFinding(finding));
    }

    return findings;
  }

  /**
   * Parse CSV line handling quoted values
   */
  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result.map(val => val.replace(/^"|"$/g, ''));
  }

  /**
   * Normalize imported finding data
   */
  private static normalizeImportFinding(data: any): ImportFinding {
    return {
      title: data.title || '',
      description: data.description || '',
      severity: this.normalizeSeverity(data.severity),
      category: data.category || '',
      location: data.location || '',
      due_date: data.due_date || undefined,
      assigned_to_email: data.assigned_to_email || undefined,
      project_name: data.project_name || undefined,
      status: this.normalizeStatus(data.status),
      immediate_action_required: this.normalizeBoolean(data.immediate_action_required),
      regulatory_requirement: data.regulatory_requirement || undefined,
      potential_consequences: data.potential_consequences || undefined,
      recommended_actions: data.recommended_actions || undefined
    };
  }

  /**
   * Normalize severity values
   */
  private static normalizeSeverity(value: string): 'low' | 'medium' | 'high' {
    if (!value) return 'medium';
    const normalized = value.toLowerCase().trim();
    if (['low', 'minor'].includes(normalized)) return 'low';
    if (['high', 'critical', 'severe'].includes(normalized)) return 'high';
    return 'medium';
  }

  /**
   * Normalize status values
   */
  private static normalizeStatus(value: string): 'open' | 'in_progress' | 'resolved' | 'closed' {
    if (!value) return 'open';
    const normalized = value.toLowerCase().trim().replace(/[_\s]/g, '');
    if (['inprogress', 'progress', 'working'].includes(normalized)) return 'in_progress';
    if (['resolved', 'fixed', 'completed'].includes(normalized)) return 'resolved';
    if (['closed', 'done'].includes(normalized)) return 'closed';
    return 'open';
  }

  /**
   * Normalize boolean values
   */
  private static normalizeBoolean(value: string): boolean {
    if (!value) return false;
    const normalized = value.toLowerCase().trim();
    return ['true', 'yes', '1', 'y'].includes(normalized);
  }

  /**
   * Validate imported findings
   */
  static async validateFindings(findings: ImportFinding[]): Promise<ValidationResult> {
    const errors: ImportError[] = [];
    const warnings: ImportError[] = [];

    // Get reference data for validation
    const { data: projects } = await supabase.from('projects').select('id, name');
    const { data: users } = await supabase.from('profiles').select('id, email');
    
    const projectNames = projects?.map(p => p.name.toLowerCase()) || [];
    const userEmails = users?.map(u => u.email.toLowerCase()) || [];

    for (let i = 0; i < findings.length; i++) {
      const finding = findings[i];
      const rowNum = i + 2; // Account for header row

      // Required field validation
      if (!finding.title?.trim()) {
        errors.push({ row: rowNum, field: 'title', message: 'Title is required' });
      }
      if (!finding.description?.trim()) {
        errors.push({ row: rowNum, field: 'description', message: 'Description is required' });
      }
      if (!finding.category?.trim()) {
        errors.push({ row: rowNum, field: 'category', message: 'Category is required' });
      }
      if (!finding.location?.trim()) {
        errors.push({ row: rowNum, field: 'location', message: 'Location is required' });
      }

      // Date validation
      if (finding.due_date) {
        const dueDate = new Date(finding.due_date);
        if (isNaN(dueDate.getTime())) {
          errors.push({ row: rowNum, field: 'due_date', message: 'Invalid date format. Use YYYY-MM-DD' });
        } else if (dueDate < new Date()) {
          warnings.push({ row: rowNum, field: 'due_date', message: 'Due date is in the past' });
        }
      }

      // Email validation
      if (finding.assigned_to_email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(finding.assigned_to_email)) {
          errors.push({ row: rowNum, field: 'assigned_to_email', message: 'Invalid email format' });
        } else if (!userEmails.includes(finding.assigned_to_email.toLowerCase())) {
          warnings.push({ row: rowNum, field: 'assigned_to_email', message: 'User with this email not found in system' });
        }
      }

      // Project validation
      if (finding.project_name && !projectNames.includes(finding.project_name.toLowerCase())) {
        warnings.push({ row: rowNum, field: 'project_name', message: 'Project not found in system' });
      }

      // Length validation
      if (finding.title && finding.title.length > 255) {
        errors.push({ row: rowNum, field: 'title', message: 'Title must be less than 255 characters' });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Import findings to database
   */
  static async importFindings(findings: ImportFinding[], createdBy: string): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      total_processed: findings.length,
      successful_imports: 0,
      failed_imports: 0,
      errors: [],
      created_findings: []
    };

    // Get reference data
    const { data: projects } = await supabase.from('projects').select('id, name');
    const { data: users } = await supabase.from('profiles').select('id, email');
    
    const projectMap = new Map(projects?.map(p => [p.name.toLowerCase(), p.id]) || []);
    const userMap = new Map(users?.map(u => [u.email.toLowerCase(), u.id]) || []);

    for (let i = 0; i < findings.length; i++) {
      const finding = findings[i];
      const rowNum = i + 2;

      try {
        // Resolve project ID
        let projectId = null;
        if (finding.project_name) {
          projectId = projectMap.get(finding.project_name.toLowerCase()) || null;
        }

        // Resolve assigned user ID
        let assignedTo = null;
        if (finding.assigned_to_email) {
          assignedTo = userMap.get(finding.assigned_to_email.toLowerCase()) || null;
        }

        // Calculate due date if not provided
        let dueDate = finding.due_date;
        if (!dueDate) {
          const defaultDays = finding.severity === 'high' ? 7 : finding.severity === 'medium' ? 14 : 30;
          const date = new Date();
          date.setDate(date.getDate() + defaultDays);
          dueDate = date.toISOString().split('T')[0];
        }

        // Insert finding
        const { data: insertedFinding, error } = await supabase
          .from('findings')
          .insert({
            title: finding.title,
            description: finding.description,
            severity: finding.severity,
            category: finding.category,
            location: finding.location,
            due_date: dueDate,
            status: finding.status || 'open',
            immediate_action_required: finding.immediate_action_required || false,
            regulatory_requirement: finding.regulatory_requirement,
            potential_consequences: finding.potential_consequences,
            recommended_actions: finding.recommended_actions,
            project_id: projectId,
            assigned_to: assignedTo,
            created_by: createdBy
          })
          .select('id')
          .single();

        if (error) {
          throw error;
        }

        result.successful_imports++;
        result.created_findings.push(insertedFinding.id);

      } catch (error: any) {
        result.failed_imports++;
        result.errors.push({
          row: rowNum,
          message: `Failed to import: ${error.message}`,
          data: finding
        });
      }
    }

    result.success = result.failed_imports === 0;
    return result;
  }

  /**
   * Get import statistics
   */
  static async getImportHistory(userId: string, limit: number = 10): Promise<any[]> {
    // This would require an import_history table to track imports
    // For now, return empty array
    return [];
  }
} 