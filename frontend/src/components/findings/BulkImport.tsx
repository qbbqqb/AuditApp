import React, { useState, useRef } from 'react';
import { BulkImportService, ImportFinding, ImportResult, ValidationResult } from '../../services/bulkImportService';
import { NotificationService } from '../../services/notificationService';
import { useAuth } from '../../contexts/AuthContext';

interface BulkImportProps {
  onImportComplete?: (result: ImportResult) => void;
  onClose?: () => void;
}

export const BulkImport: React.FC<BulkImportProps> = ({ onImportComplete, onClose }) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState<'upload' | 'validate' | 'preview' | 'importing' | 'complete'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedFindings, setParsedFindings] = useState<ImportFinding[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const downloadTemplate = () => {
    const template = BulkImportService.generateTemplate();
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'findings_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const parseFile = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const findings = await BulkImportService.parseFile(file);
      setParsedFindings(findings);
      setStep('validate');
    } catch (err: any) {
      setError(`Failed to parse file: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const validateFindings = async () => {
    setLoading(true);
    setError(null);

    try {
      const validation = await BulkImportService.validateFindings(parsedFindings);
      setValidationResult(validation);
      setStep('preview');
    } catch (err: any) {
      setError(`Validation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const importFindings = async () => {
    if (!user || !validationResult) return;

    setLoading(true);
    setStep('importing');
    setError(null);

    try {
      const result = await BulkImportService.importFindings(parsedFindings, user.id);
      setImportResult(result);
      setStep('complete');
      
      if (onImportComplete) {
        onImportComplete(result);
      }

      // Send notifications for successfully imported findings
      for (const findingId of result.created_findings) {
        // This would typically be handled by database triggers or background jobs
        // For now, we'll skip automatic notifications during bulk import
      }
    } catch (err: any) {
      setError(`Import failed: ${err.message}`);
      setStep('preview');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep('upload');
    setFile(null);
    setParsedFindings([]);
    setValidationResult(null);
    setImportResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Bulk Import Findings</h3>
        <p className="text-sm text-gray-600">
          Upload a CSV or Excel file to import multiple findings at once
        </p>
      </div>

      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="mt-4">
            <label htmlFor="file-upload" className="cursor-pointer">
              <span className="mt-2 block text-sm font-medium text-gray-900">
                {file ? file.name : 'Choose a file or drag and drop'}
              </span>
              <span className="mt-1 block text-xs text-gray-500">
                CSV or Excel files up to 10MB
              </span>
            </label>
            <input
              ref={fileInputRef}
              id="file-upload"
              name="file-upload"
              type="file"
              className="sr-only"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={downloadTemplate}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download Template
        </button>
        
        <button
          type="button"
          onClick={parseFile}
          disabled={!file || loading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Parsing...' : 'Parse File'}
        </button>
      </div>
    </div>
  );

  const renderValidationStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">File Parsed Successfully</h3>
        <p className="text-sm text-gray-600">
          Found {parsedFindings.length} findings. Click validate to check for errors.
        </p>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Preview (first 3 findings):</h4>
        <div className="space-y-2">
          {parsedFindings.slice(0, 3).map((finding, index) => (
            <div key={index} className="bg-white p-3 rounded border text-sm">
              <div className="font-medium">{finding.title}</div>
              <div className="text-gray-600">{finding.severity} • {finding.category}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Start Over
        </button>
        
        <button
          type="button"
          onClick={validateFindings}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Validating...' : 'Validate Data'}
        </button>
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Validation Results</h3>
        {validationResult?.isValid ? (
          <p className="text-sm text-green-600">✓ All data is valid and ready to import</p>
        ) : (
          <p className="text-sm text-red-600">⚠ Found {validationResult?.errors.length} errors that must be fixed</p>
        )}
      </div>

      {validationResult && (
        <div className="space-y-4">
          {validationResult.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-800 mb-2">Errors (must fix):</h4>
              <div className="space-y-1 text-sm text-red-700">
                {validationResult.errors.map((error, index) => (
                  <div key={index}>
                    Row {error.row}: {error.message} {error.field && `(${error.field})`}
                  </div>
                ))}
              </div>
            </div>
          )}

          {validationResult.warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800 mb-2">Warnings (optional):</h4>
              <div className="space-y-1 text-sm text-yellow-700">
                {validationResult.warnings.map((warning, index) => (
                  <div key={index}>
                    Row {warning.row}: {warning.message} {warning.field && `(${warning.field})`}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">Import Summary:</h4>
            <div className="text-sm text-blue-700">
              <div>Total findings: {parsedFindings.length}</div>
              <div>Valid findings: {parsedFindings.length - validationResult.errors.length}</div>
              <div>Findings with warnings: {validationResult.warnings.length}</div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => setStep('validate')}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Back
        </button>
        
        <button
          type="button"
          onClick={importFindings}
          disabled={!validationResult?.isValid || loading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Importing...' : `Import ${parsedFindings.length - (validationResult?.errors.length || 0)} Findings`}
        </button>
      </div>
    </div>
  );

  const renderImportingStep = () => (
    <div className="text-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <h3 className="text-lg font-medium text-gray-900">Importing Findings...</h3>
      <p className="text-sm text-gray-600">Please wait while we process your data</p>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
          <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-medium text-gray-900">Import Complete!</h3>
      </div>

      {importResult && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Import Results:</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Total Processed:</span>
              <span className="ml-2 font-medium">{importResult.total_processed}</span>
            </div>
            <div>
              <span className="text-gray-600">Successful:</span>
              <span className="ml-2 font-medium text-green-600">{importResult.successful_imports}</span>
            </div>
            <div>
              <span className="text-gray-600">Failed:</span>
              <span className="ml-2 font-medium text-red-600">{importResult.failed_imports}</span>
            </div>
            <div>
              <span className="text-gray-600">Success Rate:</span>
              <span className="ml-2 font-medium">
                {Math.round((importResult.successful_imports / importResult.total_processed) * 100)}%
              </span>
            </div>
          </div>

          {importResult.errors.length > 0 && (
            <div className="mt-4">
              <h5 className="font-medium text-red-800 mb-2">Import Errors:</h5>
              <div className="space-y-1 text-sm text-red-700 max-h-32 overflow-y-auto">
                {importResult.errors.map((error, index) => (
                  <div key={index}>Row {error.row}: {error.message}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-center space-x-4">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Import More
        </button>
        
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-1 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {step === 'upload' && renderUploadStep()}
      {step === 'validate' && renderValidationStep()}
      {step === 'preview' && renderPreviewStep()}
      {step === 'importing' && renderImportingStep()}
      {step === 'complete' && renderCompleteStep()}
    </div>
  );
}; 