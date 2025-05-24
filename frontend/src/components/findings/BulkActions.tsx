import React, { useState, useCallback } from 'react';
import { FindingsService } from '../../services/findingsService';
import type { Finding, FindingStatus } from '../../types/findings';

interface BulkActionsProps {
  selectedFindings: Finding[];
  onClearSelection: () => void;
  onUpdateComplete: () => void;
}

const BulkActions: React.FC<BulkActionsProps> = ({
  selectedFindings,
  onClearSelection,
  onUpdateComplete
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [error, setError] = useState('');

  const selectedIds = selectedFindings.map(f => f.id);

  const handleBulkStatusUpdate = useCallback(async (status: FindingStatus) => {
    try {
      setIsUpdating(true);
      setError('');
      
      await FindingsService.bulkUpdateStatus(selectedIds, status);
      
      setShowStatusModal(false);
      onClearSelection();
      onUpdateComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update findings');
    } finally {
      setIsUpdating(false);
    }
  }, [selectedIds, onClearSelection, onUpdateComplete]);

  const handleExport = useCallback(async (format: 'csv' | 'pdf') => {
    try {
      setIsUpdating(true);
      setError('');

      // Generate export data
      const exportData = selectedFindings.map(finding => ({
        'Finding ID': finding.id,
        'Title': finding.title,
        'Status': finding.status,
        'Severity': finding.severity,
        'Category': finding.category,
        'Location': finding.location,
        'Created Date': new Date(finding.created_at).toLocaleDateString(),
        'Due Date': new Date(finding.due_date).toLocaleDateString(),
        'Created By': `${finding.created_by_profile.first_name} ${finding.created_by_profile.last_name}`,
        'Assigned To': finding.assigned_to_profile 
          ? `${finding.assigned_to_profile.first_name} ${finding.assigned_to_profile.last_name}`
          : 'Unassigned',
        'Project': finding.project.name,
        'Description': finding.description
      }));

      if (format === 'csv') {
        // Convert to CSV
        const headers = Object.keys(exportData[0]);
        const csvContent = [
          headers.join(','),
          ...exportData.map(row => 
            headers.map(header => `"${row[header as keyof typeof row] || ''}"`).join(',')
          )
        ].join('\n');

        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `findings-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }

      setShowExportModal(false);
      onClearSelection();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export findings');
    } finally {
      setIsUpdating(false);
    }
  }, [selectedFindings, onClearSelection]);

  if (selectedFindings.length === 0) {
    return null;
  }

  return (
    <>
      {/* Bulk Actions Bar */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white shadow-lg rounded-lg border p-4 z-50">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">
              {selectedFindings.length} finding{selectedFindings.length !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={onClearSelection}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear selection
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowStatusModal(true)}
              disabled={isUpdating}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Update Status
            </button>
            
            <button
              onClick={() => setShowExportModal(true)}
              disabled={isUpdating}
              className="px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              Export
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-2 text-sm text-red-600">{error}</div>
        )}
      </div>

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Update Status for {selectedFindings.length} Finding{selectedFindings.length !== 1 ? 's' : ''}
            </h3>
            
            <div className="space-y-3">
              <button
                onClick={() => handleBulkStatusUpdate('in_progress')}
                disabled={isUpdating}
                className="w-full text-left px-4 py-3 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <div className="font-medium">Mark as In Progress</div>
                <div className="text-sm text-gray-500">Start working on these findings</div>
              </button>

              <button
                onClick={() => handleBulkStatusUpdate('completed_pending_approval')}
                disabled={isUpdating}
                className="w-full text-left px-4 py-3 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <div className="font-medium">Submit for Approval</div>
                <div className="text-sm text-gray-500">Mark as completed and ready for review</div>
              </button>

              <button
                onClick={() => handleBulkStatusUpdate('closed')}
                disabled={isUpdating}
                className="w-full text-left px-4 py-3 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <div className="font-medium">Close Findings</div>
                <div className="text-sm text-gray-500">Mark as completed and closed</div>
              </button>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Export {selectedFindings.length} Finding{selectedFindings.length !== 1 ? 's' : ''}
            </h3>
            
            <div className="space-y-3">
              <button
                onClick={() => handleExport('csv')}
                disabled={isUpdating}
                className="w-full text-left px-4 py-3 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <div className="font-medium">📄 Export as CSV</div>
                <div className="text-sm text-gray-500">Spreadsheet format for analysis</div>
              </button>

              <button
                onClick={() => handleExport('pdf')}
                disabled={isUpdating}
                className="w-full text-left px-4 py-3 border rounded-lg hover:bg-gray-50 disabled:opacity-50 opacity-50"
              >
                <div className="font-medium">📋 Export as PDF</div>
                <div className="text-sm text-gray-500">Report format (Coming soon)</div>
              </button>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BulkActions; 